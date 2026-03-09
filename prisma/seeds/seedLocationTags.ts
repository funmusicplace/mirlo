import prisma from "../prisma";

const locations = [
  // Canada
  {
    city: "Toronto",
    region: "ON",
    country: "Canada",
    slug: "toronto-on-canada",
  },
  {
    city: "Vancouver",
    region: "BC",
    country: "Canada",
    slug: "vancouver-bc-canada",
  },
  {
    city: "Montreal",
    region: "QC",
    country: "Canada",
    slug: "montreal-qc-canada",
  },
  {
    city: "Calgary",
    region: "AB",
    country: "Canada",
    slug: "calgary-ab-canada",
  },
  { city: "Ottawa", region: "ON", country: "Canada", slug: "ottawa-on-canada" },
  {
    city: "Winnipeg",
    region: "MB",
    country: "Canada",
    slug: "winnipeg-mb-canada",
  },
  {
    city: "Quebec City",
    region: "QC",
    country: "Canada",
    slug: "quebec-city-qc-canada",
  },
  {
    city: "Halifax",
    region: "NS",
    country: "Canada",
    slug: "halifax-ns-canada",
  },
  {
    city: "Kitchener",
    region: "ON",
    country: "Canada",
    slug: "kitchener-on-canada",
  },

  // United States (major cities)
  {
    city: "New York",
    region: "NY",
    country: "United States",
    slug: "new-york-ny-us",
  },
  {
    city: "Los Angeles",
    region: "CA",
    country: "United States",
    slug: "los-angeles-ca-us",
  },
  {
    city: "Chicago",
    region: "IL",
    country: "United States",
    slug: "chicago-il-us",
  },
  {
    city: "Houston",
    region: "TX",
    country: "United States",
    slug: "houston-tx-us",
  },
  {
    city: "Phoenix",
    region: "AZ",
    country: "United States",
    slug: "phoenix-az-us",
  },
  {
    city: "Philadelphia",
    region: "PA",
    country: "United States",
    slug: "philadelphia-pa-us",
  },
  {
    city: "San Antonio",
    region: "TX",
    country: "United States",
    slug: "san-antonio-tx-us",
  },
  {
    city: "San Diego",
    region: "CA",
    country: "United States",
    slug: "san-diego-ca-us",
  },
  {
    city: "Dallas",
    region: "TX",
    country: "United States",
    slug: "dallas-tx-us",
  },
  {
    city: "San Francisco",
    region: "CA",
    country: "United States",
    slug: "san-francisco-ca-us",
  },
  {
    city: "Austin",
    region: "TX",
    country: "United States",
    slug: "austin-tx-us",
  },
  {
    city: "Denver",
    region: "CO",
    country: "United States",
    slug: "denver-co-us",
  },
  {
    city: "Boston",
    region: "MA",
    country: "United States",
    slug: "boston-ma-us",
  },
  {
    city: "Portland",
    region: "OR",
    country: "United States",
    slug: "portland-or-us",
  },
  {
    city: "Seattle",
    region: "WA",
    country: "United States",
    slug: "seattle-wa-us",
  },
  {
    city: "Nashville",
    region: "TN",
    country: "United States",
    slug: "nashville-tn-us",
  },
  {
    city: "New Orleans",
    region: "LA",
    country: "United States",
    slug: "new-orleans-la-us",
  },
  {
    city: "Memphis",
    region: "TN",
    country: "United States",
    slug: "memphis-tn-us",
  },
  {
    city: "Atlanta",
    region: "GA",
    country: "United States",
    slug: "atlanta-ga-us",
  },
  {
    city: "Miami",
    region: "FL",
    country: "United States",
    slug: "miami-fl-us",
  },

  // United Kingdom
  { city: "London", country: "United Kingdom", slug: "london-uk" },
  { city: "Manchester", country: "United Kingdom", slug: "manchester-uk" },
  { city: "Birmingham", country: "United Kingdom", slug: "birmingham-uk" },
  { city: "Glasgow", country: "United Kingdom", slug: "glasgow-uk" },
  { city: "Liverpool", country: "United Kingdom", slug: "liverpool-uk" },
  { city: "Leeds", country: "United Kingdom", slug: "leeds-uk" },
  { city: "Edinburgh", country: "United Kingdom", slug: "edinburgh-uk" },
  { city: "Bristol", country: "United Kingdom", slug: "bristol-uk" },

  // Europe
  {
    city: "Berlin",
    region: "Berlin",
    country: "Germany",
    slug: "berlin-germany",
  },
  {
    city: "Paris",
    region: "Île-de-France",
    country: "France",
    slug: "paris-france",
  },
  {
    city: "Amsterdam",
    region: "North Holland",
    country: "Netherlands",
    slug: "amsterdam-nl",
  },
  {
    city: "Barcelona",
    region: "Catalonia",
    country: "Spain",
    slug: "barcelona-spain",
  },
  { city: "Madrid", country: "Spain", slug: "madrid-spain" },
  { city: "Rome", country: "Italy", slug: "rome-italy" },
  { city: "Milan", country: "Italy", slug: "milan-italy" },
  { city: "Vienna", country: "Austria", slug: "vienna-austria" },
  { city: "Prague", country: "Czech Republic", slug: "prague-czech-republic" },
  { city: "Stockholm", country: "Sweden", slug: "stockholm-sweden" },
  { city: "Copenhagen", country: "Denmark", slug: "copenhagen-denmark" },
  { city: "Oslo", country: "Norway", slug: "oslo-norway" },
  { city: "Helsinki", country: "Finland", slug: "helsinki-finland" },

  // Australia
  {
    city: "Sydney",
    region: "NSW",
    country: "Australia",
    slug: "sydney-nsw-australia",
  },
  {
    city: "Melbourne",
    region: "VIC",
    country: "Australia",
    slug: "melbourne-vic-australia",
  },
  {
    city: "Brisbane",
    region: "QLD",
    country: "Australia",
    slug: "brisbane-qld-australia",
  },
  {
    city: "Perth",
    region: "WA",
    country: "Australia",
    slug: "perth-wa-australia",
  },
  {
    city: "Adelaide",
    region: "SA",
    country: "Australia",
    slug: "adelaide-sa-australia",
  },

  // Other regions
  { city: "Tokyo", country: "Japan", slug: "tokyo-japan" },
  { city: "Seoul", country: "South Korea", slug: "seoul-south-korea" },
  { city: "Bangkok", country: "Thailand", slug: "bangkok-thailand" },
  { city: "Singapore", country: "Singapore", slug: "singapore-singapore" },
  { city: "Mexico City", country: "Mexico", slug: "mexico-city-mexico" },
  { city: "São Paulo", country: "Brazil", slug: "sao-paulo-brazil" },
  {
    city: "Buenos Aires",
    country: "Argentina",
    slug: "buenos-aires-argentina",
  },
  {
    city: "Cape Town",
    country: "South Africa",
    slug: "cape-town-south-africa",
  },
];

export async function seedLocationTags() {
  console.log("Seeding location tags...");

  for (const location of locations) {
    await prisma.locationTag.upsert({
      where: { slug: location.slug },
      update: {},
      create: location,
    });
  }

  console.log("Location tags seeded successfully");
}
