// The ways to reach customers, by kind of business. Each has a price per lead and a short description. How well each one
// fits each customer group stays hidden: you learn it by testing. Costs are rough real-world orders of magnitude (see
// docs/specs/realism-pass-3.md); they keep the same scale the original three channels had, so the economics hold.
import type { ModelId } from "./business";

export interface ChannelSpec {
  readonly name: string;
  readonly blurb: string;
  readonly costPerLeadCents: number;
}

export const CHANNELS_BY_MODEL: Readonly<Record<ModelId, readonly ChannelSpec[]>> = {
  software: [
    { name: "Cold outreach", blurb: "Emails and calls to people in this group.", costPerLeadCents: 800 },
    { name: "Communities", blurb: "Forums, Slack and Discord groups where they already talk about the problem.", costPerLeadCents: 300 },
    { name: "Paid ads", blurb: "Search and social ads aimed at this group.", costPerLeadCents: 2500 },
    { name: "Content and search", blurb: "Guides and tools that people find when they search. Cheap, and it takes a while to work.", costPerLeadCents: 500 },
    { name: "Launch sites", blurb: "A launch on a product directory or newsletter. Cheap leads, mostly curious visitors.", costPerLeadCents: 400 },
    { name: "Integrations and partners", blurb: "Being listed inside a tool they already use, or sold by a consultant who serves them.", costPerLeadCents: 1200 },
  ],
  service: [
    { name: "Cold outreach", blurb: "Calls and visits to people who might need you.", costPerLeadCents: 800 },
    { name: "Communities", blurb: "Local groups, neighbourhood forums and clubs where people ask for recommendations.", costPerLeadCents: 300 },
    { name: "Paid ads", blurb: "Local ads and lead marketplaces. You pay for every enquiry, good or not.", costPerLeadCents: 2500 },
    { name: "Reviews and local search", blurb: "A well-kept business listing with reviews, so people find you when they search nearby.", costPerLeadCents: 600 },
    { name: "Referral thank-yous", blurb: "A thank-you for every customer who sends a friend. Few leads, very good ones.", costPerLeadCents: 500 },
    { name: "Partner referrals", blurb: "Agreements with people who meet your customers first, such as agents, venues or clinics.", costPerLeadCents: 1000 },
  ],
  location: [
    { name: "Cold outreach", blurb: "Visiting nearby businesses and people, and asking local partners to send customers.", costPerLeadCents: 800 },
    { name: "Communities", blurb: "Local groups, clubs and events where your customers already gather.", costPerLeadCents: 300 },
    { name: "Paid ads", blurb: "Search and social ads aimed at people near you.", costPerLeadCents: 2500 },
    { name: "Flyers and door hangers", blurb: "Printed offers in the streets around you. Cheap per person, few of them come.", costPerLeadCents: 700 },
    { name: "Local reviews and maps", blurb: "A good listing and reviews, so people nearby find you and trust you.", costPerLeadCents: 600 },
    { name: "Office and club partnerships", blurb: "Deals with employers, clubs and schools whose people become regulars together.", costPerLeadCents: 1200 },
  ],
  product: [
    { name: "Cold outreach", blurb: "Messages to shops, buyers and people who might want it.", costPerLeadCents: 800 },
    { name: "Communities", blurb: "Groups and forums of people who love this kind of thing.", costPerLeadCents: 300 },
    { name: "Paid ads", blurb: "Social and search ads. Easy to start, costly to keep going.", costPerLeadCents: 2500 },
    { name: "Creators and gifting", blurb: "Sending the product to people with an audience who might show it.", costPerLeadCents: 1500 },
    { name: "Markets and pop-ups", blurb: "A stall at a local market: customers touch it and buy there and then.", costPerLeadCents: 900 },
    { name: "Marketplaces and shops", blurb: "A listing on a marketplace or on shop shelves. They take a cut of every sale.", costPerLeadCents: 1200 },
  ],
};
