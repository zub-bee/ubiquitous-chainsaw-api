import { db } from "./openDBConnection.js";
import { v7 as uuidv7 } from "uuid";
import { createTable } from "./createTable.js";

// Realistic first names by gender
const maleFirstNames = [
  "James",
  "John",
  "Robert",
  "Michael",
  "David",
  "William",
  "Richard",
  "Joseph",
  "Thomas",
  "Charles",
  "Christopher",
  "Daniel",
  "Matthew",
  "Anthony",
  "Mark",
  "Donald",
  "Steven",
  "Paul",
  "Andrew",
  "Joshua",
  "Kenneth",
  "Kevin",
  "Brian",
  "George",
  "Timothy",
  "Ronald",
  "Edward",
  "Jason",
  "Jeffrey",
  "Ryan",
  "Jacob",
  "Gary",
  "Nicholas",
  "Eric",
  "Jonathan",
  "Stephen",
  "Larry",
  "Justin",
  "Scott",
  "Brandon",
  "Benjamin",
  "Samuel",
  "Raymond",
  "Gregory",
  "Frank",
  "Alexander",
  "Patrick",
  "Jack",
  "Dennis",
  "Jerry",
  "Tyler",
  "Aaron",
  "Jose",
  "Adam",
  "Nathan",
  "Henry",
  "Peter",
  "Zachary",
  "Douglas",
  "Harold",
  "Chinedu",
  "Emeka",
  "Obinna",
  "Ikenna",
  "Tunde",
  "Adewale",
  "Olumide",
  "Babatunde",
  "Ayodele",
  "Chijioke",
  "Nnamdi",
  "Olusegun",
  "Femi",
  "Segun",
  "Kwame",
  "Kofi",
  "Yaw",
  "Mensah",
  "Ousmane",
  "Moussa",
  "Ibrahim",
  "Abdou",
  "Mamadou",
  "Aliou",
  "Cheikh",
  "Modou",
  "Omar",
  "Amadou",
  "Boubacar",
  "Souleymane",
  "Liam",
  "Noah",
  "Oliver",
  "Elijah",
  "Lucas",
  "Mason",
  "Logan",
  "Ethan",
  "Aiden",
  "Sebastian",
  "Caleb",
  "Owen",
  "Dylan",
  "Luke",
  "Gabriel",
  "Carter",
];

const femaleFirstNames = [
  "Mary",
  "Patricia",
  "Jennifer",
  "Linda",
  "Barbara",
  "Elizabeth",
  "Susan",
  "Jessica",
  "Sarah",
  "Karen",
  "Lisa",
  "Nancy",
  "Betty",
  "Margaret",
  "Sandra",
  "Ashley",
  "Dorothy",
  "Kimberly",
  "Emily",
  "Donna",
  "Michelle",
  "Carol",
  "Amanda",
  "Melissa",
  "Deborah",
  "Stephanie",
  "Rebecca",
  "Sharon",
  "Laura",
  "Cynthia",
  "Kathleen",
  "Amy",
  "Angela",
  "Shirley",
  "Anna",
  "Brenda",
  "Pamela",
  "Emma",
  "Nicole",
  "Helen",
  "Samantha",
  "Katherine",
  "Christine",
  "Debra",
  "Rachel",
  "Carolyn",
  "Janet",
  "Catherine",
  "Maria",
  "Heather",
  "Ngozi",
  "Chioma",
  "Adaeze",
  "Amara",
  "Nneka",
  "Folake",
  "Aisha",
  "Titilayo",
  "Olufunke",
  "Yetunde",
  "Binta",
  "Aminata",
  "Fatou",
  "Mariama",
  "Awa",
  "Khady",
  "Ndeye",
  "Coumba",
  "Adama",
  "Aissatou",
  "Oumou",
  "Fatoumata",
  "Olivia",
  "Ava",
  "Isabella",
  "Sophia",
  "Mia",
  "Charlotte",
  "Amelia",
  "Harper",
  "Evelyn",
  "Abigail",
  "Ella",
  "Scarlett",
  "Grace",
  "Lily",
  "Zoe",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
  "Gomez",
  "Phillips",
  "Evans",
  "Turner",
  "Diaz",
  "Parker",
  "Cruz",
  "Edwards",
  "Collins",
  "Reyes",
  "Okafor",
  "Adeyemi",
  "Ogunleye",
  "Olawale",
  "Adesanya",
  "Nwosu",
  "Eze",
  "Okoro",
  "Balogun",
  "Okonkwo",
  "Adebayo",
  "Obi",
  "Chukwu",
  "Afolabi",
  "Diallo",
  "Toure",
  "Camara",
  "Sow",
  "Ba",
  "Ndiaye",
  "Fall",
  "Diop",
  "Sylla",
  "Traore",
  "Konate",
  "Coulibaly",
  "Keita",
  "Dembele",
  "Cisse",
  "Bah",
  "Mensah",
  "Asante",
  "Boateng",
  "Owusu",
  "Agyemang",
  "Appiah",
  "Ankrah",
  "Patel",
  "Kim",
  "Chen",
  "Wang",
  "Singh",
  "Kumar",
  "Ali",
  "Hassan",
  "Mueller",
  "Schmidt",
  "Weber",
  "Fischer",
  "Dubois",
  "Leroy",
  "Moreau",
];

const countries = [
  { id: "NG", name: "Nigeria" },
  { id: "GH", name: "Ghana" },
  { id: "SN", name: "Senegal" },
  { id: "KE", name: "Kenya" },
  { id: "ZA", name: "South Africa" },
  { id: "US", name: "United States" },
  { id: "GB", name: "United Kingdom" },
  { id: "CA", name: "Canada" },
  { id: "DE", name: "Germany" },
  { id: "FR", name: "France" },
  { id: "IN", name: "India" },
  { id: "BR", name: "Brazil" },
  { id: "AU", name: "Australia" },
  { id: "JP", name: "Japan" },
  { id: "EG", name: "Egypt" },
  { id: "BJ", name: "Benin" },
  { id: "CM", name: "Cameroon" },
  { id: "TZ", name: "Tanzania" },
  { id: "UG", name: "Uganda" },
  { id: "RW", name: "Rwanda" },
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getAgeGroup(age) {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 64) return "adult";
  return "senior";
}

function generateProfile(usedNames) {
  const gender = Math.random() > 0.5 ? "male" : "female";
  const firstNames = gender === "male" ? maleFirstNames : femaleFirstNames;

  let name;
  // Ensure unique names by appending a middle initial if needed
  let attempts = 0;
  do {
    const first = randomElement(firstNames);
    const last = randomElement(lastNames);
    if (attempts > 0) {
      const middle = String.fromCharCode(65 + randomInt(0, 25));
      name = `${first} ${middle}. ${last}`;
    } else {
      name = `${first} ${last}`;
    }
    attempts++;
  } while (usedNames.has(name) && attempts < 50);

  usedNames.add(name);

  const age = randomInt(5, 85);
  const country = randomElement(countries);

  return {
    id: uuidv7(),
    name,
    gender,
    gender_probability: randomFloat(0.7, 1.0),
    age,
    age_group: getAgeGroup(age),
    country_id: country.id,
    country_name: country.name,
    country_probability: randomFloat(0.3, 1.0),
  };
}

export async function seedProfiles(count = 10000) {
  await createTable();

  const BATCH_SIZE = 500;
  const usedNames = new Set();
  let totalInserted = 0;

  for (let i = 0; i < count; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, count - i);
    const cols = [
      "id",
      "name",
      "gender",
      "gender_probability",
      "age",
      "age_group",
      "country_id",
      "country_name",
      "country_probability",
    ];
    const numCols = cols.length;
    const valuesClauses = [];
    const params = [];

    for (let j = 0; j < batchSize; j++) {
      const profile = generateProfile(usedNames);
      const base = j * numCols;
      valuesClauses.push(
        `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`,
      );
      params.push(
        profile.id,
        profile.name,
        profile.gender,
        profile.gender_probability,
        profile.age,
        profile.age_group,
        profile.country_id,
        profile.country_name,
        profile.country_probability,
      );
    }

    const sql = `
      INSERT INTO profiles (${cols.join(", ")})
      VALUES ${valuesClauses.join(", ")}
      ON CONFLICT (name) DO NOTHING
      RETURNING id
    `;

    const result = await db.query(sql, params);
    totalInserted += result.rowCount;
    console.log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted ${result.rowCount} profiles`,
    );
  }

  console.log(`Seeding complete. Total inserted: ${totalInserted} profiles.`);
  return totalInserted;
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProfiles()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err.message);
      process.exit(1);
    });
}
