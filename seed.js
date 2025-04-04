const { MongoClient, ObjectId } = require('mongodb');

async function seedDatabase() {
  const uri = 'mongodb+srv://rajyavardhansing2003:%40Rajesh12@cluster0.d8tq2.mongodb.net/HealthPal?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully to MongoDB Atlas');
    
    const db = client.db('HealthPal');

    // Clear existing data
    console.log('Clearing existing collections...');
    try { await db.collection('patients').drop(); } catch (e) { console.log('No patients collection to drop'); }
    try { await db.collection('doctors').drop(); } catch (e) { console.log('No doctors collection to drop'); }
    try { await db.collection('persons').drop(); } catch (e) { console.log('No persons collection to drop'); }
    try { await db.collection('appointments').drop(); } catch (e) { console.log('No appointments collection to drop'); }
    try { await db.collection('consultations').drop(); } catch (e) { console.log('No consultations collection to drop'); }
    try { await db.collection('prescriptions').drop(); } catch (e) { console.log('No prescriptions collection to drop'); }
    try { await db.collection('medicalrecords').drop(); } catch (e) { console.log('No medicalrecords collection to drop'); }
    try { await db.collection('reminders').drop(); } catch (e) { console.log('No reminders collection to drop'); }

    // Create some ObjectIds to use throughout the seed
    const patientIds = [
      new ObjectId(),
      new ObjectId(),
      new ObjectId(),
      new ObjectId(),
      new ObjectId()
    ];

    const doctorIds = [
      new ObjectId(),
      new ObjectId(),
      new ObjectId(),
      new ObjectId()
    ];

    const appointmentIds = [
      new ObjectId(),
      new ObjectId(),
      new ObjectId(),
      new ObjectId(),
      new ObjectId(),
      new ObjectId(),
      new ObjectId(),
      new ObjectId()
    ];

    const consultationIds = [
      new ObjectId(),
      new ObjectId(),
      new ObjectId(),
      new ObjectId()
    ];

    // Calculate dates relative to today
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    // =============== SEED PATIENTS ===============
    const patients = [
      {
        _id: patientIds[0],
        name: "John Smith",
        email: "john.smith@example.com",
        firebaseUid: "firebase-uid-patient-1",
        phone: "555-123-4567",
        dateOfBirth: new Date("1985-04-12"),
        gender: "male",
        address: "123 Main St, Anytown, CA 94123",
        emergencyContact: {
          name: "Jane Smith",
          relationship: "Wife",
          phone: "555-987-6543"
        },
        bloodType: "A+",
        allergies: ["Penicillin", "Peanuts"],
        conditions: ["Hypertension"],
        role: "patient",
        createdAt: new Date()
      },
      {
        _id: patientIds[1],
        name: "Maria Garcia",
        email: "maria.garcia@example.com",
        firebaseUid: "firebase-uid-patient-2",
        phone: "555-234-5678",
        dateOfBirth: new Date("1990-08-24"),
        gender: "female",
        address: "456 Oak Ave, Somecity, NY 10023",
        emergencyContact: {
          name: "Carlos Garcia",
          relationship: "Husband",
          phone: "555-876-5432"
        },
        bloodType: "O-",
        allergies: ["Sulfa drugs", "Shellfish"],
        conditions: ["Asthma", "Eczema"],
        role: "patient",
        createdAt: new Date()
      },
      {
        _id: patientIds[2],
        name: "Robert Johnson",
        email: "robert.johnson@example.com",
        firebaseUid: "firebase-uid-patient-3",
        phone: "555-345-6789",
        dateOfBirth: new Date("1978-11-03"),
        gender: "male",
        address: "789 Pine Rd, Othercity, TX 75001",
        emergencyContact: {
          name: "Mary Johnson",
          relationship: "Mother",
          phone: "555-765-4321"
        },
        bloodType: "B+",
        allergies: ["Latex"],
        conditions: ["Diabetes Type 2", "Hypertension"],
        role: "patient",
        createdAt: new Date()
      },
      {
        _id: patientIds[3],
        name: "Emily Wilson",
        email: "emily.wilson@example.com",
        firebaseUid: "firebase-uid-patient-4",
        phone: "555-456-7890",
        dateOfBirth: new Date("1995-02-15"),
        gender: "female",
        address: "321 Maple St, Anothercity, FL 33101",
        emergencyContact: {
          name: "Thomas Wilson",
          relationship: "Father",
          phone: "555-654-3210"
        },
        bloodType: "AB+",
        allergies: [],
        conditions: ["Migraine"],
        role: "patient",
        createdAt: new Date()
      },
      {
        _id: patientIds[4],
        name: "David Lee",
        email: "david.lee@example.com",
        firebaseUid: "firebase-uid-patient-5",
        phone: "555-567-8901",
        dateOfBirth: new Date("1982-06-30"),
        gender: "male",
        address: "987 Cedar Blvd, Someville, WA 98001",
        emergencyContact: {
          name: "Susan Lee",
          relationship: "Sister",
          phone: "555-543-2109"
        },
        bloodType: "O+",
        allergies: ["Ibuprofen", "Dairy"],
        conditions: ["Arthritis"],
        role: "patient",
        createdAt: new Date()
      }
    ];

    // =============== SEED DOCTORS ===============
    const doctors = [
      {
        _id: doctorIds[0],
        name: "Dr. Sarah Thompson",
        email: "dr.thompson@healthpal.com",
        firebaseUid: "firebase-uid-doctor-1",
        phone: "555-111-2222",
        dateOfBirth: new Date("1975-09-18"),
        gender: "female",
        role: "doctor",
        specialization: "Cardiology",
        licenseNumber: "MED12345",
        education: [
          {
            degree: "MD",
            institution: "Harvard Medical School",
            year: 2000
          },
          {
            degree: "Residency",
            institution: "Massachusetts General Hospital",
            year: 2004
          }
        ],
        experience: "15+ years in Cardiology",
        consultationFee: 200,
        availability: {
          monday: [{start: "09:00", end: "17:00"}],
          tuesday: [{start: "09:00", end: "17:00"}],
          wednesday: [{start: "09:00", end: "17:00"}],
          thursday: [{start: "09:00", end: "17:00"}],
          friday: [{start: "09:00", end: "13:00"}],
          saturday: [],
          sunday: []
        },
        rating: 4.8,
        reviews: [
          {
            patient: patientIds[0],
            rating: 5,
            comment: "Dr. Thompson is excellent. She took her time to explain everything.",
            date: new Date("2023-09-15")
          },
          {
            patient: patientIds[1],
            rating: 4.5,
            comment: "Very knowledgeable and professional.",
            date: new Date("2023-08-22")
          }
        ],
        createdAt: new Date()
      },
      {
        _id: doctorIds[1],
        name: "Dr. James Wilson",
        email: "dr.wilson@healthpal.com",
        firebaseUid: "firebase-uid-doctor-2",
        phone: "555-222-3333",
        dateOfBirth: new Date("1980-03-12"),
        gender: "male",
        role: "doctor",
        specialization: "Dermatology",
        licenseNumber: "MED23456",
        education: [
          {
            degree: "MD",
            institution: "Johns Hopkins University School of Medicine",
            year: 2005
          },
          {
            degree: "Residency",
            institution: "Mayo Clinic",
            year: 2009
          }
        ],
        experience: "12 years in Dermatology",
        consultationFee: 180,
        availability: {
          monday: [{start: "10:00", end: "18:00"}],
          tuesday: [{start: "10:00", end: "18:00"}],
          wednesday: [],
          thursday: [{start: "10:00", end: "18:00"}],
          friday: [{start: "10:00", end: "18:00"}],
          saturday: [{start: "10:00", end: "14:00"}],
          sunday: []
        },
        rating: 4.7,
        reviews: [
          {
            patient: patientIds[2],
            rating: 5,
            comment: "Dr. Wilson helped me resolve my skin issues that I've had for years.",
            date: new Date("2023-07-11")
          }
        ],
        createdAt: new Date()
      },
      {
        _id: doctorIds[2],
        name: "Dr. Emily Chen",
        email: "dr.chen@healthpal.com",
        firebaseUid: "firebase-uid-doctor-3",
        phone: "555-333-4444",
        dateOfBirth: new Date("1979-11-28"),
        gender: "female",
        role: "doctor",
        specialization: "Pediatrics",
        licenseNumber: "MED34567",
        education: [
          {
            degree: "MD",
            institution: "Stanford University School of Medicine",
            year: 2003
          },
          {
            degree: "Residency",
            institution: "Children's Hospital of Philadelphia",
            year: 2007
          }
        ],
        experience: "14 years in Pediatrics",
        consultationFee: 150,
        availability: {
          monday: [{start: "09:00", end: "16:00"}],
          tuesday: [{start: "09:00", end: "16:00"}],
          wednesday: [{start: "09:00", end: "16:00"}],
          thursday: [{start: "09:00", end: "16:00"}],
          friday: [{start: "09:00", end: "16:00"}],
          saturday: [],
          sunday: []
        },
        rating: 4.9,
        reviews: [
          {
            patient: patientIds[3],
            rating: 5,
            comment: "Dr. Chen is amazing with kids. My daughter loves her!",
            date: new Date("2023-10-05")
          }
        ],
        createdAt: new Date()
      },
      {
        _id: doctorIds[3],
        name: "Dr. Michael Rodriguez",
        email: "dr.rodriguez@healthpal.com",
        firebaseUid: "firebase-uid-doctor-4",
        phone: "555-444-5555",
        dateOfBirth: new Date("1977-05-20"),
        gender: "male",
        role: "doctor",
        specialization: "Orthopedics",
        licenseNumber: "MED45678",
        education: [
          {
            degree: "MD",
            institution: "University of California, San Francisco",
            year: 2001
          },
          {
            degree: "Residency",
            institution: "Hospital for Special Surgery",
            year: 2006
          }
        ],
        experience: "16 years in Orthopedics",
        consultationFee: 220,
        availability: {
          monday: [{start: "08:00", end: "15:00"}],
          tuesday: [{start: "08:00", end: "15:00"}],
          wednesday: [{start: "08:00", end: "15:00"}],
          thursday: [{start: "08:00", end: "15:00"}],
          friday: [{start: "08:00", end: "12:00"}],
          saturday: [],
          sunday: []
        },
        rating: 4.6,
        reviews: [
          {
            patient: patientIds[4],
            rating: 4.5,
            comment: "Dr. Rodriguez helped me recover from my knee injury quickly.",
            date: new Date("2023-08-30")
          }
        ],
        createdAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: "Dr. Amelia Patel",
        email: "dr.patel@healthpal.com",
        firebaseUid: "firebase-uid-doctor-5",
        phone: "555-555-6666",
        dateOfBirth: new Date("1982-07-15"),
        gender: "female",
        role: "doctor",
        specialization: "Neurology",
        licenseNumber: "MED56789",
        education: [
          {
            degree: "MD",
            institution: "Yale School of Medicine",
            year: 2008
          }
        ],
        experience: "12 years in Neurology",
        consultationFee: 230,
        availability: {
          monday: [{start: "09:00", end: "17:00"}],
          tuesday: [{start: "09:00", end: "17:00"}],
          wednesday: [{start: "09:00", end: "17:00"}],
          thursday: [{start: "09:00", end: "17:00"}],
          friday: [{start: "09:00", end: "13:00"}]
        },
        rating: 4.9,
        reviews: [],
        createdAt: new Date()
      }
    ];

    // =============== SEED APPOINTMENTS ===============
    const appointments = [
      {
        _id: appointmentIds[0],
        patient: patientIds[0],
        doctor: doctorIds[0],
        date: tomorrow,
        time: {
          start: "10:00",
          end: "10:30"
        },
        type: "in-person",
        reason: "Annual heart checkup",
        status: "confirmed",
        notes: "Patient has been taking medication as prescribed",
        createdAt: new Date()
      },
      {
        _id: appointmentIds[1],
        patient: patientIds[1],
        doctor: doctorIds[1],
        date: nextWeek,
        time: {
          start: "14:00",
          end: "14:30"
        },
        type: "in-person",
        reason: "Skin rash follow-up",
        status: "confirmed",
        notes: "Check if the prescribed cream has helped",
        createdAt: new Date()
      },
      {
        _id: appointmentIds[2],
        patient: patientIds[2],
        doctor: doctorIds[2],
        date: yesterday,
        time: {
          start: "11:00",
          end: "11:30"
        },
        type: "virtual",
        reason: "Diabetes management",
        status: "completed",
        notes: "Review blood sugar logs",
        createdAt: new Date(Date.now() - 7*24*60*60*1000) // Created a week ago
      },
      {
        _id: appointmentIds[3],
        patient: patientIds[3],
        doctor: doctorIds[3],
        date: nextWeek,
        time: {
          start: "09:00",
          end: "09:30"
        },
        type: "in-person",
        reason: "Wrist pain evaluation",
        status: "confirmed",
        notes: "Possible carpal tunnel syndrome",
        createdAt: new Date()
      }
    ];

    // =============== SEED CONSULTATIONS ===============
    const consultations = [
      {
        _id: consultationIds[0],
        appointment: appointmentIds[2],
        patient: patientIds[2],
        doctor: doctorIds[2],
        symptoms: ["Increased thirst", "Frequent urination", "Fatigue"],
        diagnosis: "Diabetes Type 2 - Blood sugar not well controlled",
        notes: "Patient's HbA1c is 8.2, which is higher than target. Adjusting insulin dosage.",
        vitalSigns: {
          bloodPressure: "138/85",
          heartRate: 78,
          temperature: 98.6,
          respiratoryRate: 16,
          oxygenSaturation: 98,
          bloodGlucose: 182
        },
        followUpRequired: true,
        followUpDate: nextWeek,
        createdAt: yesterday
      }
    ];

    // =============== SEED PRESCRIPTIONS ===============
    const prescriptions = [
      {
        consultation: consultationIds[0],
        patient: patientIds[2],
        doctor: doctorIds[2],
        medications: [
          {
            name: "Metformin",
            dosage: "1000mg",
            frequency: "Twice daily",
            duration: "30 days",
            instructions: "Take with meals"
          },
          {
            name: "Insulin Glargine",
            dosage: "20 units",
            frequency: "Once daily",
            duration: "30 days",
            instructions: "Inject subcutaneously at bedtime"
          }
        ],
        notes: "Monitor blood glucose levels before meals and at bedtime. Call if blood glucose consistently above 200mg/dL.",
        expiryDate: new Date(yesterday.getTime() + 30*24*60*60*1000), // 30 days after consultation
        createdAt: yesterday
      }
    ];

    // =============== SEED MEDICAL RECORDS ===============
    const medicalRecords = [
      {
        patient: patientIds[0],
        recordType: "Lab Result",
        title: "Complete Blood Count",
        date: new Date(today.getTime() - 60*24*60*60*1000), // 60 days ago
        provider: "LabCorp",
        description: "Annual blood work shows all values within normal range.",
        attachments: [
          {
            name: "CBC_Results.pdf",
            fileUrl: "https://storage.healthpal.com/medical-records/CBC_Results_123456.pdf",
            contentType: "application/pdf"
          }
        ],
        createdAt: new Date(today.getTime() - 60*24*60*60*1000)
      },
      {
        patient: patientIds[2],
        recordType: "Lab Result",
        title: "HbA1c Test",
        date: new Date(today.getTime() - 30*24*60*60*1000), // 30 days ago
        provider: "Diabetes Care Center",
        description: "HbA1c: 8.2% (Target: <7.0%). Indicates suboptimal glucose control over past 3 months.",
        attachments: [
          {
            name: "HbA1c_Results.pdf",
            fileUrl: "https://storage.healthpal.com/medical-records/HbA1c_123456.pdf",
            contentType: "application/pdf"
          }
        ],
        createdAt: new Date(today.getTime() - 30*24*60*60*1000)
      }
    ];

    // =============== SEED REMINDERS ===============
    const reminders = [
      {
        user: patientIds[0],
        title: "Take Blood Pressure Medication",
        description: "Lisinopril 10mg",
        type: "medication",
        frequency: "daily",
        time: "08:00",
        createdAt: new Date()
      },
      {
        user: patientIds[2],
        title: "Take Morning Insulin",
        description: "20 units of Insulin Glargine",
        type: "medication",
        frequency: "daily",
        time: "07:30",
        createdAt: new Date()
      }
    ];

    // =============== INSERT SEED DATA ===============

    console.log('Inserting patients...');
    await db.collection('patients').insertMany(patients);
    
    console.log('Inserting doctors...');
    await db.collection('doctors').insertMany(doctors);

    // Copy to persons collection
    console.log('Inserting persons...');
    const persons = [...patients, ...doctors];
    await db.collection('persons').insertMany(persons);

    console.log('Inserting appointments...');
    await db.collection('appointments').insertMany(appointments);
    
    console.log('Inserting consultations...');
    await db.collection('consultations').insertMany(consultations);
    
    console.log('Inserting prescriptions...');
    await db.collection('prescriptions').insertMany(prescriptions);
    
    console.log('Inserting medical records...');
    await db.collection('medicalrecords').insertMany(medicalRecords);
    
    console.log('Inserting reminders...');
    await db.collection('reminders').insertMany(reminders);

    // Log completion
    console.log("===== Seed Complete =====");
    console.log(`Inserted ${patients.length} patients`);
    console.log(`Inserted ${doctors.length} doctors`);
    console.log(`Inserted ${appointments.length} appointments`);
    console.log(`Inserted ${consultations.length} consultations`);
    console.log(`Inserted ${prescriptions.length} prescriptions`);
    console.log(`Inserted ${medicalRecords.length} medical records`);
    console.log(`Inserted ${reminders.length} reminders`);

    // Make sure to close the client connection when done
    await client.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
    
    // Always try to close the connection even if there's an error
    try {
      await client.close();
    } catch (closeError) {
      console.error('Error closing database connection:', closeError);
    }
  }
}

seedDatabase().catch(console.error);