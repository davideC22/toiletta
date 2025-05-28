import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import UniqueConstraint
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity
from datetime import datetime, timedelta, date, time

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["JWT_SECRET_KEY"] = "your-super-secret-key"  # Change this in production!
jwt = JWTManager(app)
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String, nullable=False)
    email = db.Column(db.String, unique=True, nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    dogs = db.relationship('Dog', back_populates='user', lazy=True)
    appointments = db.relationship('Appointment', back_populates='user', lazy=True)

class Dog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String, nullable=False)
    breed = db.Column(db.String)
    age = db.Column(db.Integer)
    appointments = db.relationship('Appointment', back_populates='dog', lazy=True)
    user = db.relationship('User', back_populates='dogs')

class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    price = db.Column(db.Float, nullable=False)
    appointments = db.relationship('Appointment', back_populates='service', lazy=True)

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    dog_id = db.Column(db.Integer, db.ForeignKey('dog.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('service.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time, nullable=False)
    status = db.Column(db.String, default='upcoming')
    user = db.relationship('User', back_populates='appointments')
    dog = db.relationship('Dog', back_populates='appointments')
    service = db.relationship('Service', back_populates='appointments')

class Availability(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    time_slot = db.Column(db.Time, nullable=False) # Represents the start time of a slot
    is_available = db.Column(db.Boolean, default=True)
    __table_args__ = (UniqueConstraint('date', 'time_slot', name='uq_date_time_slot'),)

def create_tables():
    with app.app_context():
        db.create_all()

def populate_services():
    with app.app_context():
        if not Service.query.first():
            services_data = [
                {"name": "Full Grooming", "description": "Includes a bath, brush, haircut, nail trim, and ear cleaning.", "price": 85.0},
                {"name": "Bath & Brush", "description": "A refreshing bath and thorough brushing.", "price": 50.0},
                {"name": "Taglio", "description": "Taglio personalizzato per il tuo cane.", "price": 60.0},
                {"name": "Toelettatura Completa", "description": "Bagno e taglio combinati.", "price": 79.0},
                {"name": "Nail Trim", "description": "Quick and precise nail trimming.", "price": 20.0},
                {"name": "Extra", "description": "Servizi aggiuntivi come pulizia denti.", "price": 25.0}
            ]
            for service_info in services_data:
                service = Service(**service_info)
                db.session.add(service)
            db.session.commit()

if __name__ == '__main__':
    create_tables()
    populate_services()
    # app.run(debug=True) # Keep this commented out to prevent hanging
    print("Database tables created and services populated.")

# Helper function to populate availability
def populate_availability(days=3):
    with app.app_context():
        print("Populating availability...")
        today = date.today()
        for day_offset in range(days):
            current_date = today + timedelta(days=day_offset)
            # Check if availability for this date already exists
            if Availability.query.filter_by(date=current_date).first():
                print(f"Availability for {current_date} already exists. Skipping.")
                continue

            # Define working hours and slot duration
            start_hour = 9
            end_hour = 17
            slot_duration_minutes = 30
            
            current_time = datetime.strptime(f"{start_hour}:00", "%H:%M").time()
            end_time = datetime.strptime(f"{end_hour}:00", "%H:%M").time()

            while current_time < end_time:
                availability_slot = Availability(date=current_date, time_slot=current_time, is_available=True)
                db.session.add(availability_slot)
                
                # Increment current_time by slot_duration_minutes
                current_dt = datetime.combine(date.min, current_time) + timedelta(minutes=slot_duration_minutes)
                current_time = current_dt.time()
        try:
            db.session.commit()
            print(f"Availability populated for {days} days from {today}.")
        except Exception as e:
            db.session.rollback()
            print(f"Error populating availability: {e}")


@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')
    dog_name = data.get('dog_name')
    dog_breed = data.get('dog_breed')
    dog_age = data.get('dog_age')

    if not all([full_name, email, password]):
        return jsonify({"error": "Missing required fields (full_name, email, password)"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User with this email already exists"}), 409

    hashed_password = generate_password_hash(password)
    new_user = User(full_name=full_name, email=email, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit() # Commit to get user ID for dog

    if dog_name:
        new_dog = Dog(name=dog_name, breed=dog_breed, age=dog_age, owner=new_user)
        db.session.add(new_dog)
        db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(identity=user.id)
    return jsonify(access_token=access_token), 200

@app.route('/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    # For simple token-based auth, client just discards the token.
    # Server-side blocklist can be implemented for true logout.
    return jsonify({"message": "Logout successful"}), 200

@app.route('/auth/status', methods=['GET'])
@jwt_required(optional=True)
def auth_status():
    current_user_id = get_jwt_identity()
    if current_user_id:
        return jsonify({"logged_in": True, "user_id": current_user_id}), 200
    else:
        return jsonify({"logged_in": False}), 200

# API Endpoints
@app.route('/api/services', methods=['GET'])
def get_services():
    services = Service.query.all()
    return jsonify([{"id": s.id, "name": s.name, "description": s.description, "price": s.price} for s in services]), 200

@app.route('/api/availability', methods=['GET'])
def get_availability():
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({"error": "Date parameter is required"}), 400
    try:
        query_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    available_slots = Availability.query.filter_by(date=query_date, is_available=True).all()
    return jsonify([{"id": slot.id, "date": slot.date.isoformat(), "time_slot": slot.time_slot.strftime('%H:%M:%S'), "is_available": slot.is_available} for slot in available_slots]), 200

@app.route('/api/appointments', methods=['POST'])
@jwt_required()
def create_appointment():
    user_id = get_jwt_identity()
    data = request.get_json()

    dog_id = data.get('dog_id')
    service_id = data.get('service_id')
    date_str = data.get('date')
    time_str = data.get('time')

    if not all([dog_id, service_id, date_str, time_str]):
        return jsonify({"error": "Missing required fields (dog_id, service_id, date, time)"}), 400

    dog = Dog.query.filter_by(id=dog_id, user_id=user_id).first()
    if not dog:
        return jsonify({"error": "Dog not found or does not belong to user"}), 404

    service = Service.query.get(service_id)
    if not service:
        return jsonify({"error": "Service not found"}), 404

    try:
        appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        appointment_time = datetime.strptime(time_str, '%H:%M').time()
    except ValueError:
        return jsonify({"error": "Invalid date or time format. Use YYYY-MM-DD and HH:MM"}), 400

    availability_slot = Availability.query.filter_by(date=appointment_date, time_slot=appointment_time, is_available=True).first()
    if not availability_slot:
        return jsonify({"error": "Selected slot is not available"}), 409

    new_appointment = Appointment(
        user_id=user_id,
        dog_id=dog_id,
        service_id=service_id,
        date=appointment_date,
        time=appointment_time,
        status='upcoming'
    )
    db.session.add(new_appointment)
    availability_slot.is_available = False
    db.session.add(availability_slot)

    try:
        db.session.commit()
        return jsonify({
            "message": "Appointment created successfully",
            "appointment": {
                "id": new_appointment.id,
                "user_id": new_appointment.user_id,
                "dog_id": new_appointment.dog_id,
                "dog_name": new_appointment.dog.name,
                "service_id": new_appointment.service_id,
                "service_name": new_appointment.service.name,
                "date": new_appointment.date.isoformat(),
                "time": new_appointment.time.strftime('%H:%M'),
                "status": new_appointment.status
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create appointment", "details": str(e)}), 500

@app.route('/api/appointments', methods=['GET'])
@jwt_required()
def get_appointments():
    user_id = get_jwt_identity()
    appointments = Appointment.query.filter_by(user_id=user_id).order_by(Appointment.date, Appointment.time).all()
    
    result = []
    for appt in appointments:
        result.append({
            "id": appt.id,
            "user_id": appt.user_id,
            "dog_id": appt.dog_id,
            "dog_name": appt.dog.name,
            "service_id": appt.service_id,
            "service_name": appt.service.name,
            "date": appt.date.isoformat(),
            "time": appt.time.strftime('%H:%M'),
            "status": appt.status
        })
    return jsonify(result), 200

@app.route('/api/appointments/<int:appointment_id>', methods=['PUT'])
@jwt_required()
def update_appointment(appointment_id):
    user_id = get_jwt_identity()
    appointment = Appointment.query.filter_by(id=appointment_id, user_id=user_id).first()

    if not appointment:
        return jsonify({"error": "Appointment not found or access forbidden"}), 404

    data = request.get_json()
    new_status = data.get('status')

    if new_status == 'cancelled':
        if appointment.status == 'cancelled':
            return jsonify({"message": "Appointment is already cancelled"}), 200
        
        appointment.status = 'cancelled'
        # Make the slot available again
        availability_slot = Availability.query.filter_by(date=appointment.date, time_slot=appointment.time).first()
        if availability_slot:
            availability_slot.is_available = True
            db.session.add(availability_slot)
        else:
            # This case should ideally not happen if data integrity is maintained
            # Create a new availability slot if it somehow got deleted
            new_availability_slot = Availability(date=appointment.date, time_slot=appointment.time, is_available=True)
            db.session.add(new_availability_slot)
        
        try:
            db.session.commit()
            return jsonify({"message": "Appointment cancelled successfully", "appointment_id": appointment.id, "new_status": "cancelled"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to cancel appointment", "details": str(e)}), 500
    # Add logic for other updates (reschedule, change service/dog) here if needed in future
    return jsonify({"error": "Invalid update request. Only status='cancelled' is supported for now."}), 400


@app.route('/api/appointments/<int:appointment_id>', methods=['DELETE'])
@jwt_required()
def delete_appointment(appointment_id):
    user_id = get_jwt_identity()
    appointment = Appointment.query.filter_by(id=appointment_id, user_id=user_id).first()

    if not appointment:
        return jsonify({"error": "Appointment not found or access forbidden"}), 404

    # Make the slot available again
    availability_slot = Availability.query.filter_by(date=appointment.date, time_slot=appointment.time).first()
    if availability_slot:
        availability_slot.is_available = True
        db.session.add(availability_slot)
    else:
        # This case should ideally not happen if data integrity is maintained
        # Create a new availability slot if it somehow got deleted
        new_availability_slot = Availability(date=appointment.date, time_slot=appointment.time, is_available=True)
        db.session.add(new_availability_slot)

    db.session.delete(appointment)
    
    try:
        db.session.commit()
        return jsonify({"message": "Appointment deleted successfully", "appointment_id": appointment_id}), 200 # Or 204 No Content
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete appointment", "details": str(e)}), 500

# Modify the main execution block to call populate_availability
if __name__ == '__main__':
    with app.app_context(): # Ensure app context for db operations
        create_tables()
        populate_services()
        populate_availability(days=7) # Populate for the next 7 days
    # app.run(debug=True) # Keep this commented out
    print("Database setup complete. Availability populated.")

# Profile Management Endpoints
@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404 # Should not happen with valid JWT

    return jsonify({
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email
    }), 200

@app.route('/api/profile/dogs', methods=['GET'])
@jwt_required()
def get_user_dogs():
    user_id = get_jwt_identity()
    dogs = Dog.query.filter_by(user_id=user_id).all()
    return jsonify([{"id": dog.id, "name": dog.name, "breed": dog.breed, "age": dog.age} for dog in dogs]), 200

@app.route('/api/profile/dogs', methods=['POST'])
@jwt_required()
def add_user_dog():
    user_id = get_jwt_identity()
    data = request.get_json()

    name = data.get('name')
    breed = data.get('breed')
    age = data.get('age')

    if not name:
        return jsonify({"error": "Dog name is required"}), 400

    new_dog = Dog(user_id=user_id, name=name, breed=breed, age=age)
    db.session.add(new_dog)
    try:
        db.session.commit()
        return jsonify({
            "message": "Dog added successfully",
            "dog": {"id": new_dog.id, "name": new_dog.name, "breed": new_dog.breed, "age": new_dog.age}
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to add dog", "details": str(e)}), 500

@app.route('/api/profile/dogs/<int:dog_id>', methods=['PUT'])
@jwt_required()
def update_user_dog(dog_id):
    user_id = get_jwt_identity()
    dog = Dog.query.get(dog_id)

    if not dog:
        return jsonify({"error": "Dog not found"}), 404

    if dog.user_id != user_id:
        return jsonify({"error": "Forbidden: You do not own this dog"}), 403

    data = request.get_json()
    if 'name' in data:
        dog.name = data['name']
    if 'breed' in data:
        dog.breed = data['breed']
    if 'age' in data:
        dog.age = data['age']

    try:
        db.session.commit()
        return jsonify({
            "message": "Dog updated successfully",
            "dog": {"id": dog.id, "name": dog.name, "breed": dog.breed, "age": dog.age}
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update dog", "details": str(e)}), 500

@app.route('/api/profile/dogs/<int:dog_id>', methods=['DELETE'])
@jwt_required()
def delete_user_dog(dog_id):
    user_id = get_jwt_identity()
    dog = Dog.query.get(dog_id)

    if not dog:
        return jsonify({"error": "Dog not found"}), 404

    if dog.user_id != user_id:
        return jsonify({"error": "Forbidden: You do not own this dog"}), 403

    # Check for existing appointments for this dog
    if Appointment.query.filter_by(dog_id=dog_id).first():
        return jsonify({"error": "Cannot delete dog with existing appointments. Please cancel or reassign appointments first."}), 409

    db.session.delete(dog)
    try:
        db.session.commit()
        return jsonify({"message": "Dog deleted successfully"}), 200 # Or 204 No Content
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete dog", "details": str(e)}), 500
