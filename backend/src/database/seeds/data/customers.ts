// Sprint 7.4 — Demo customers with addresses, for realistic order/
// review association. Passwords are seed-only placeholders (same
// pattern/caveat as Sprint 6's admin seed).
export interface CustomerSeed {
  email: string;
  firstName: string;
  lastName: string;
  address: { line1: string; city: string; region: string; postalCode: string; country: string };
}

export const CUSTOMER_SEEDS: CustomerSeed[] = [
  { email: "amelia.rossi@example.com", firstName: "Amelia", lastName: "Rossi", address: { line1: "142 Birch Lane", city: "Austin", region: "TX", postalCode: "78701", country: "US" } },
  { email: "jordan.kim@example.com", firstName: "Jordan", lastName: "Kim", address: { line1: "88 Maple Court", city: "Seattle", region: "WA", postalCode: "98101", country: "US" } },
  { email: "priya.nair@example.com", firstName: "Priya", lastName: "Nair", address: { line1: "27 Willow Street", city: "Chicago", region: "IL", postalCode: "60601", country: "US" } },
  { email: "marcus.bell@example.com", firstName: "Marcus", lastName: "Bell", address: { line1: "509 Ash Avenue", city: "Denver", region: "CO", postalCode: "80202", country: "US" } },
  { email: "sofia.martinez@example.com", firstName: "Sofia", lastName: "Martinez", address: { line1: "16 Cedar Way", city: "Miami", region: "FL", postalCode: "33101", country: "US" } },
  { email: "grace.oconnor@example.com", firstName: "Grace", lastName: "O'Connor", address: { line1: "73 Elm Drive", city: "Boston", region: "MA", postalCode: "02108", country: "US" } },
  { email: "daniel.wu@example.com", firstName: "Daniel", lastName: "Wu", address: { line1: "204 Poplar Place", city: "San Jose", region: "CA", postalCode: "95101", country: "US" } },
  { email: "isabella.silva@example.com", firstName: "Isabella", lastName: "Silva", address: { line1: "61 Chestnut Row", city: "Phoenix", region: "AZ", postalCode: "85001", country: "US" } },
];
