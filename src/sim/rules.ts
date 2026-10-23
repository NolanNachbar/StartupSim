// What a real founder in each industry has to get right before and while they trade: licences, insurance, permits and
// regulation. These are short plain-language notes, not legal advice; the sim already puts their cost in the weekly
// running costs. Based on what the industry audits found missing (see docs/specs/realism-pass-3.md).
import type { ModelId } from "./business";

export const RULES_BY_INDUSTRY: readonly string[] = [
  /* 0 Local services */ "Trades usually need a licence and liability insurance before the first job; a repair shop or laundromat adds a business licence and a lease.",
  /* 1 Consumer apps */ "Apps that take payments or collect data need clear terms and a privacy policy; app stores take 15 to 30 percent of what you charge.",
  /* 2 Business software */ "Business buyers ask for security answers and contracts before they sign, and big companies take months to buy.",
  /* 3 Health and wellness */ "Trainers need certification and insurance; clinics need licensed clinicians; health apps that hold patient data face privacy law (HIPAA in the US); supplements are regulated by the FDA.",
  /* 4 Money and fintech */ "Moving or holding other people's money needs licences (money transmitter, bank partners); tax preparers need a preparer number; advisers are regulated by title. Most startups here partner with a licensed firm.",
  /* 5 Creators and education */ "Anyone teaching children needs background checks and insurance; some places license childcare and tutoring centres; selling courses means collecting sales tax or VAT.",
  /* 6 Food and drink */ "A health permit, food-handler certificates, a business licence and insurance before opening; alcohol needs its own licence; packaged food faces labelling and allergen rules.",
  /* 7 Retail and e-commerce */ "You collect sales tax, pay marketplace and card fees (about 3 percent plus 30 cents a sale), and carry stock you paid for before you sold it.",
  /* 8 Travel and hospitality */ "Lodging needs licences, fire and safety checks and insurance; collecting local occupancy tax is usually required; travel agents may need a seller of travel licence.",
  /* 9 Real estate and home */ "Selling or renting for others usually needs a broker licence; screening tenants is regulated per report; contractors need licences and insurance.",
  /* 10 Pets and animals */ "Boarding, day-care and grooming need licences, zoning approval and insurance; selling pet food is regulated by state.",
  /* 11 Entertainment and events */ "Venues need occupancy and fire approvals; serving alcohol needs a licence; selling tickets means handling refunds and fees; events need liability insurance.",
  /* 12 Transport and logistics */ "Carrying goods for hire needs commercial insurance, often a vehicle registration and a carrier number; drivers and fuel run most of your costs.",
  /* 13 Beauty and personal care */ "Stylists, barbers and nail technicians need a licence in most states; a mobile service needs a permit; skincare sold to the public is regulated by the FDA.",
];

/** Rules that depend on how you do business as well as the industry. */
export const RULES_BY_MODEL: Readonly<Record<ModelId, string>> = {
  software: "You will pay card fees (about 3 percent) and hosting that grows with your customers.",
  service: "Your own time is the product: a solo founder can only sell so many hours, so growth needs people.",
  location: "A place means a lease, a deposit, a fit-out and insurance before you earn anything, and rent is due whether or not people come.",
  product: "You buy stock before you sell it, so cash is tied up in inventory, and returns come back to you.",
};
