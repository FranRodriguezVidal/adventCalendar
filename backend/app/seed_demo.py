from app.database.database import SessionLocal
from app.services.demo_data import seed_demo_data


if __name__ == '__main__':
    db = SessionLocal()
    try:
        seed_demo_data(db)
        print('Demo calendars created')
    finally:
        db.close()
