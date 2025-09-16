import { faker } from '@faker-js/faker';

function randomElement(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

export function generateTraits(cluster) {
  // cluster can bias selection for creating realistic high-compat groups
  if (!cluster) { cluster = faker.number.int({ min: 0, max: 2 }); }
  // three clusters: 0 (studious/quiet), 1 (balanced), 2 (social/night)
  switch(cluster) {
    case 0:
      return {
        sleepSchedule: 'early',
        studyHabits: 'quiet',
        cleanlinessLevel: faker.number.int({ min: 4, max: 5 }),
        socialPreference: 'introvert',
        noisePreference: 'quiet',
        hobbies: faker.helpers.arrayElements(['reading','chess','coding','music','basketball'], faker.number.int({min:1,max:3})),
        musicPreference: faker.helpers.arrayElement(['classical','lofi','jazz','instrumental']),
        visitorFrequency: 'rarely'
      };
    case 1:
      return {
        sleepSchedule: 'flexible',
        studyHabits: 'mixed',
        cleanlinessLevel: faker.number.int({ min: 3, max: 4 }),
        socialPreference: 'balanced',
        noisePreference: 'tolerant',
        hobbies: faker.helpers.arrayElements(['reading','gaming','football','movies','music','swimming'], faker.number.int({min:1,max:3})),
        musicPreference: faker.helpers.arrayElement(['afrobeat','pop','rock','gospel','hiphop']),
        visitorFrequency: 'sometimes'
      };
    default:
      return {
        sleepSchedule: 'late',
        studyHabits: 'group',
        cleanlinessLevel: faker.number.int({ min: 2, max: 4 }),
        socialPreference: 'extrovert',
        noisePreference: 'noisy',
        hobbies: faker.helpers.arrayElements(['dance','music','football','socializing','gaming'], faker.number.int({min:1,max:3})),
        musicPreference: faker.helpers.arrayElement(['afrobeat','hiphop','edm','pop']),
        visitorFrequency: randomElement(['often','sometimes'])
      };
  }
}

export function generateStudent({ gender }) {
  const cluster = faker.number.int({ min:0, max:2 });
  const fullName = faker.person.fullName();
  const traits = generateTraits(cluster);
  const departments = ['Computer Science','Mass Communication','Business Administration','Accounting','Biochemistry','Microbiology','Economics','Political Science','Physics','Chemistry','Mathematics','Law','Medicine','Philosophy','History'];
  return {
    fullName,
    email: faker.internet.email({ firstName: fullName.split(' ')[0] }).toLowerCase(),
    password: '$2b$10$hashplaceholderhashhashhashzzzzzzzzzz', // pre-hashed or will be overwritten; optionally integrate hashing
    role: 'student',
    matricNumber: `MAT${faker.number.int({min:100000,max:999999})}`,
  // Nigerian GSM numbers commonly start with 080 / 081 / 090 etc. Build deterministic +234 format
  phone: `+234${faker.number.int({ min: 7000000000, max: 9099999999 })}`,
    gender: gender || faker.helpers.arrayElement(['male','female']),
    level: faker.helpers.arrayElement(['100','200','300','400','500']),
    department: faker.helpers.arrayElement(departments),
    personalityTraits: traits
  };
}

export function generateHostel({ gender }) {
  return {
    name: `${gender === 'female' ? 'Queens' : 'Kings'} Hall ${faker.string.alpha({ length: 1, casing: 'upper' })}`,
    type: gender,
    capacity: faker.number.int({ min: 40, max: 120 }),
    description: faker.lorem.sentence()
  };
}

export function generateRoom({ hostelId }) {
  const capacity = faker.number.int({ min: 2, max: 4 });
  return {
    hostel: hostelId,
    roomNumber: faker.number.int({ min: 100, max: 499 }).toString(),
    type: faker.helpers.arrayElement(['Standard','Premium']),
    capacity,
    occupied: 0
  };
}

export function generateComplaint({ studentId }) {
  return {
    student: studentId,
    type: faker.helpers.arrayElement(['Maintenance','Roommate','Facilities','Other']),
    description: faker.lorem.sentences({ min:1, max:2 }),
    status: 'Pending'
  };
}

export function hashWarning() {
  return 'NOTE: Seeded users share a placeholder bcrypt hash; change in production.';
}
