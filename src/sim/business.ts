// What kind of business the player starts. Public content only: the four business models, who the customers are in each
// industry, and the words those customers use. Nothing here is hidden truth, so the UI may read it (through the sim index).
// The player supplies the idea itself (for example "a small strength-training gym"); this file supplies everything
// around it so the questions, the answers, the builds and the hires all fit the kind of business.

export type ModelId = "software" | "service" | "location" | "product";

export interface ModelInfo {
  readonly id: ModelId;
  readonly name: string;
  /** One plain sentence on how this kind of business makes money; {kinds} is replaced with examples from the industry. */
  readonly blurb: string;
  /** Verbs that make a question or an answer read naturally: "pay for", "sign up for", "book", "buy". */
  readonly payVerb: string;
  /** "use", "visit", "try". */
  readonly useVerb: string;
  /** "building", "opening", "starting", "making". */
  readonly ingVerb: string;
}

export const MODELS: readonly ModelInfo[] = [
  { id: "software", name: "Software or app", blurb: "You build a product people use on a screen, such as {kinds}, and charge a monthly fee.", payVerb: "pay for", useVerb: "use", ingVerb: "building" },
  { id: "service", name: "Service business", blurb: "You do the work for clients, such as {kinds}, and charge for your time.", payVerb: "book", useVerb: "try", ingVerb: "starting" },
  { id: "location", name: "Physical location", blurb: "You open a place people come to, such as {kinds}, and charge memberships or visits.", payVerb: "sign up for", useVerb: "visit", ingVerb: "opening" },
  { id: "product", name: "Physical product", blurb: "You make or source something and sell it, such as {kinds}, one order or one subscription at a time.", payVerb: "buy", useVerb: "try", ingVerb: "making" },
];

/** What is specific to one industry and one business model: who the customers are, and their world. */
export interface Combo {
  /** The customer groups, the smallest and easiest to reach first. */
  readonly segmentNames: readonly string[];
  /** A bad moment a customer has, as a clause that follows "the last time": "the gym was packed or too far away". */
  readonly situation: string;
  /** What that moment cost them, as a clause: "I skipped it and lost another week of progress". */
  readonly cost: string;
  /** How they cope today, as a noun phrase. */
  readonly workaround: string;
  /** Where these customers gather, as a noun phrase. */
  readonly place: string;
  /** Who the first hire is: "a trainer". */
  readonly hire: string;
  /** Example ideas the player can start from, or replace with their own. */
  readonly examples: readonly string[];
  /** Three short names for kinds of business here ("a gym", "a yoga studio"), used to describe the model in this industry. */
  readonly kinds: readonly string[];
}

/** What the content below does not repeat: the short names are added by industry and model. */
type RawCombo = Omit<Combo, "kinds">;

/** Short names for kinds of business, by industry then model: used to describe each business model in that industry. */
const KINDS: readonly (readonly (readonly string[])[])[] = [[["a crew scheduler","a quoting app","a booking page"],["a handyman service","a cleaning service","a pressure-washing service"],["a repair shop","a laundromat","a bike shop"],["a tool-rental kit","a toolbox","a garden box"]],[["a habit tracker","a bill-splitting app","a meal planner"],["a life-admin concierge","a meal-prep service","an online tutor"],["a board-game cafe","a study cafe","a climbing and coffee space"],["a snack box","a water bottle","a desk organiser"]],[["an onboarding tool","an expenses app","a reporting dashboard"],["a bookkeeping service","an HR outsourcing service","a fractional operations manager"],["a coworking space","a podcast studio","a meeting-room space"],["a remote-work kit","an onboarding kit","a desk set"]],[["a reminder app","an intake form tool","a recovery app"],["a personal training service","a coaching service","a corporate wellness programme"],["a gym","a yoga studio","a physiotherapy clinic"],["a protein snack line","a supplement","a home-workout kit"]],[["an invoicing tool","a cash-flow app","a rent-collection app"],["a bookkeeping service","a tax-prep service","a budgeting coach"],["a tax and paperwork office","a currency exchange","a bookkeeping office"],["a budget planner","an invoice organiser kit","a savings box"]],[["a course-selling page","a tutor booking app","a coaching feedback app"],["a tutoring service","a music lessons service","a language coaching service"],["a coding studio for kids","an art studio","a language school"],["a science kit","a craft box","a flashcard set"]],[["a stock tracker","an ordering page","a recipe-costing tool"],["a meal-prep service","a private chef service","a catering service"],["a restaurant","a coffee shop","a bakery"],["a hot sauce brand","a baking mix line","a coffee subscription"]],[["an inventory sync tool","a returns app","a product-photo tool"],["a fulfilment service","a personal shopping service","a photography service"],["a bookshop","a vintage clothing store","a hobby shop"],["a candle line","a travel bag line","a subscription box"]],[["a hotel booking tool","a trip-planning app","a check-in app"],["an itinerary planning service","a walking-tour company","a retreat planning service"],["a guesthouse","a hostel","a campsite"],["a travel organiser","a daypack line","a travel gift box"]],[["a maintenance tracker","a viewing scheduler","a tenant screening tool"],["a property management service","a home staging service","a renovation management service"],["a real-estate office","a home-improvement showroom","a tool-hire shop"],["a storage system","a smart-sensor kit","a move-in box"]],[["a booking app for dog walkers","a vet records app","a shelter scheduler"],["a dog-walking service","a mobile grooming service","a puppy training service"],["a dog day-care","a pet-friendly cafe","a grooming salon"],["a dog-food subscription","a chew-toy line","a cat furniture brand"]],[["a ticketing app","a band booking tool","a volunteer rota app"],["a wedding planning service","a kids' party service","a team-event service"],["an escape room","a live-music bar","a mini-golf and arcade"],["a party kit","a board game","an event decor line"]],[["a route planner","a proof-of-delivery app","a load-matching tool"],["a courier service","a moving service","a medical delivery service"],["a bike repair hub","a parcel pickup point","a self-storage facility"],["a pannier line","a bike-lock set","a rider kit"]],[["a stylist booking app","a barbershop loyalty app","a salon ordering tool"],["a mobile hair and makeup service","an office barber","a home nail service"],["a barbershop","a nail salon","a spa"],["a skincare line","a hair-care range","a grooming subscription"]]];

/** By industry (the order of INDUSTRIES in world.ts), then by model (the order of MODELS). */
const RAW: readonly (readonly RawCombo[])[] = [
  // Local services
  [
    { segmentNames: ["Solo tradespeople", "Small crews", "Multi-van firms", "Franchisees", "Property managers"], situation: "a crew showed up at the wrong time", cost: "the wasted trip cost me half a day", workaround: "a whiteboard and a group chat", place: "trade groups and contractor forums", hire: "a developer", examples: ["an app that schedules crews and texts customers when they are on the way", "a quoting app for contractors", "an online booking page for small clinics"] },
    { segmentNames: ["Homeowners", "Landlords", "Small offices", "Property managers", "Restaurants"], situation: "you needed a repair and nobody called back", cost: "it dragged on for a week", workaround: "asking neighbours for names and waiting", place: "neighbourhood groups and local forums", hire: "a technician", examples: ["a same-day handyman service", "a recurring home-cleaning service", "a pressure-washing service for small businesses"] },
    { segmentNames: ["Walk-in neighbours", "Commuters", "Nearby businesses", "Tourists", "Local employers"], situation: "you needed it done and the nearest shop was closed or far away", cost: "I lost an afternoon going across town", workaround: "driving to the big shop across town", place: "local business associations and neighbourhood pages", hire: "a counter assistant", examples: ["a neighbourhood repair shop", "a self-service laundromat with a cafe", "a bike repair shop"] },
    { segmentNames: ["Homeowners", "DIY hobbyists", "Small contractors", "Landscapers", "Property managers"], situation: "you could not find the right part or tool locally", cost: "the project sat unfinished for a week", workaround: "big online marketplaces and long delivery times", place: "DIY forums and hardware hobby groups", hire: "a packer", examples: ["a tool-rental kit for homeowners", "an organised toolbox for apartments", "a garden maintenance box"] },
  ],
  // Consumer apps
  [
    { segmentNames: ["Students", "Young professionals", "Parents", "Shift workers", "Retirees"], situation: "you dropped a habit you meant to keep", cost: "I fell off the routine and it took weeks to rebuild", workaround: "reminders on my phone that I swipe away", place: "productivity communities and self-improvement groups", hire: "a developer", examples: ["a habit tracker that nudges you at the right time of day", "an app that splits shared bills with roommates", "a meal planner for busy families"] },
    { segmentNames: ["Students", "Young professionals", "Parents", "Remote workers", "Retirees"], situation: "you needed help with life admin and had no time", cost: "it cost me a whole weekend", workaround: "doing it myself at midnight", place: "community groups and parent networks", hire: "an assistant", examples: ["a personal life-admin concierge", "a meal-prep service for busy parents", "an online tutor for adults"] },
    { segmentNames: ["Students", "Young professionals", "Families", "Hobbyists", "Retirees"], situation: "you wanted somewhere to spend an evening and nowhere good was nearby", cost: "I stayed home again", workaround: "chain cafes that are always loud and full", place: "campus groups and local social pages", hire: "a barista", examples: ["a board-game cafe", "a study cafe with quiet pods", "a climbing and coffee space"] },
    { segmentNames: ["Students", "Young professionals", "Parents", "Hobbyists", "Retirees"], situation: "you wanted a better version of an everyday thing and could not find one", cost: "I kept using something that annoyed me", workaround: "whatever the big store had in stock", place: "hobby communities and social media groups", hire: "a packer", examples: ["a subscription box of healthy snacks", "a better reusable water bottle", "a compact desk organiser"] },
  ],
  // Business software
  [
    { segmentNames: ["Startups", "Small teams", "Mid-size companies", "Departments", "Enterprises"], situation: "a new hire had no laptop or access on day one", cost: "they sat idle for three days", workaround: "a shared document and a lot of emails", place: "HR and operations communities", hire: "a developer", examples: ["a checklist tool that gets new hires set up in their first week", "an app that turns receipts into expense reports", "a weekly operations report builder"] },
    { segmentNames: ["Startups", "Small teams", "Agencies", "Departments", "Enterprises"], situation: "the team needed a specialist and could not hire one", cost: "the project slipped by a month", workaround: "stretching existing staff and freelancers", place: "founder and operations communities", hire: "a consultant", examples: ["a done-for-you bookkeeping service", "an outsourced onboarding and HR service", "a fractional operations manager"] },
    { segmentNames: ["Freelancers", "Startups", "Small teams", "Remote workers", "Corporate teams"], situation: "you needed a place to meet or work and the options were awful", cost: "the meeting went badly and we lost the client", workaround: "noisy cafes and borrowed meeting rooms", place: "coworking and startup communities", hire: "a community manager", examples: ["a coworking space for small teams", "a podcast and video studio for rent", "a meeting-room space for agencies"] },
    { segmentNames: ["Startups", "Small teams", "Agencies", "Departments", "Enterprises"], situation: "the office equipment was broken or wrong and nobody owned fixing it", cost: "the team lost half a day", workaround: "buying whatever was cheapest online", place: "office-manager communities", hire: "a packer", examples: ["a plug-and-play remote work kit", "branded onboarding kits for new hires", "an ergonomic desk set for small teams"] },
  ],
  // Health and wellness
  [
    { segmentNames: ["Solo practitioners", "Small clinics", "Physio groups", "Multi-clinic owners", "Hospital clinics"], situation: "a patient forgot their appointment", cost: "the empty slot cost me an hour of income", workaround: "phone calls and a paper diary", place: "practitioner groups and clinic owner forums", hire: "a developer", examples: ["an app that reminds patients and lets them confirm with one tap", "a patient intake form tool", "a recovery plan app for physiotherapists"] },
    { segmentNames: ["Busy professionals", "Older adults", "New parents", "Athletes", "Corporate buyers"], situation: "you could not find a trainer or therapist who fit your schedule", cost: "I put my health off for another month", workaround: "random videos and the occasional appointment", place: "local wellness groups and parent networks", hire: "a coach", examples: ["a personal training service that comes to you", "a postnatal recovery coaching service", "a corporate stretching programme"] },
    { segmentNames: ["Local regulars", "Busy professionals", "Students", "Older adults", "Corporate groups"], situation: "you tried to work out and the gym was packed or too far away", cost: "I skipped it and lost another week of progress", workaround: "a crowded big-box gym and workouts at home", place: "local running clubs, neighbourhood pages and social media", hire: "a trainer", examples: ["a small strength-training gym", "a yoga and pilates studio", "a physiotherapy and recovery clinic"] },
    { segmentNames: ["Athletes", "Busy professionals", "Older adults", "Parents", "Corporate buyers"], situation: "you wanted a healthy option and everything good was out of stock or tasted awful", cost: "I fell back on junk food again", workaround: "protein bars from the supermarket", place: "fitness communities and gym groups", hire: "a packer", examples: ["a line of low-sugar protein snacks", "a recovery supplement for runners", "a home-workout equipment kit"] },
  ],
  // Money and fintech
  [
    { segmentNames: ["New freelancers", "Freelancers", "Small studios", "Agencies", "Consultancies"], situation: "a client paid six weeks late", cost: "I could not cover my own rent that month", workaround: "calendar reminders and awkward emails", place: "freelancer communities and design forums", hire: "a developer", examples: ["a tool that sends invoices and chases late payers", "a cash-flow forecasting app for shop owners", "an app that collects rent for landlords"] },
    { segmentNames: ["Freelancers", "Small shops", "Landlords", "Households", "Small businesses"], situation: "you needed money advice and everyone tried to sell you something", cost: "I made a bad decision and lost money", workaround: "a spreadsheet and a friend who knows a bit", place: "small-business and personal finance communities", hire: "an advisor", examples: ["a bookkeeping service for freelancers", "a tax-prep service for small shops", "an independent budgeting coach"] },
    { segmentNames: ["Freelancers", "Small shops", "Local businesses", "Households", "Newcomers"], situation: "you needed to sort out money matters and the nearest help was far away or closed", cost: "I lost half a day and it still was not fixed", workaround: "a bank branch with long queues", place: "local business associations and community centres", hire: "a clerk", examples: ["a neighbourhood tax and paperwork office", "a currency exchange and remittance shop", "a walk-in bookkeeping office for small businesses"] },
    { segmentNames: ["Freelancers", "Small shops", "Landlords", "Households", "Students"], situation: "you wanted a simple way to keep your money organised and nothing fit", cost: "I lost track of what I owed", workaround: "a cheap notebook and bank statements", place: "personal finance communities", hire: "a packer", examples: ["a physical budgeting planner", "a receipt and invoice organiser kit", "a savings-goal box"] },
  ],
  // Creators and education
  [
    { segmentNames: ["Hobby teachers", "Course creators", "Coaches", "Training studios", "Ed-tech firms"], situation: "a student could not get into the course after paying", cost: "I spent a weekend sorting it out by email", workaround: "a payment link and a shared folder", place: "creator communities and online-teaching groups", hire: "a developer", examples: ["a simple page that sells and delivers a course", "a booking app for private tutors", "a feedback app for coaches"] },
    { segmentNames: ["Hobby learners", "Parents", "Young professionals", "Small schools", "Companies"], situation: "you wanted to learn a skill and could not find a good teacher", cost: "I wasted months on videos that went nowhere", workaround: "free videos and the occasional lesson", place: "learning communities and parent networks", hire: "a teacher", examples: ["a private tutoring service", "a music lessons service", "a language conversation coaching service"] },
    { segmentNames: ["Kids and teens", "Parents", "Hobbyists", "Adult learners", "Schools and clubs"], situation: "you wanted a class or workshop nearby and nothing good was on", cost: "the kids stayed home on screens", workaround: "community centre classes that fill up fast", place: "parent groups, school networks and local social pages", hire: "an instructor", examples: ["an after-school coding and robotics studio", "a music and art studio", "a language school"] },
    { segmentNames: ["Hobby learners", "Parents", "Teachers", "Schools", "Young professionals"], situation: "you wanted learning materials that actually work and could not find any", cost: "I gave up halfway through", workaround: "random workbooks and free printouts", place: "teacher and homeschooling communities", hire: "a packer", examples: ["a hands-on science kit for kids", "a craft-learning subscription box", "a language flashcard set"] },
  ],
  // Food and drink
  [
    { segmentNames: ["Home cooks", "Food bloggers", "Small cafes", "Restaurant owners", "Catering firms"], situation: "the kitchen ran out of an ingredient mid-service", cost: "we turned away orders and lost the evening's takings", workaround: "a clipboard and counting shelves by hand", place: "restaurant owner groups and chef communities", hire: "a developer", examples: ["an app that tracks kitchen stock and reorders ingredients", "an online ordering page for small restaurants", "a recipe-costing tool for caterers"] },
    { segmentNames: ["Busy families", "Office teams", "Event hosts", "Small restaurants", "Wedding planners"], situation: "you needed food for a gathering and nobody could do it well", cost: "I ended up cooking all day myself", workaround: "supermarket platters and takeout", place: "local event groups and parent networks", hire: "a cook", examples: ["a weekly meal-prep service", "a private chef for dinner parties", "a corporate lunch catering service"] },
    { segmentNames: ["Local regulars", "Office workers", "Students", "Families", "Tourists"], situation: "you wanted a good place to eat nearby and everywhere was full or mediocre", cost: "I had a sad sandwich at my desk again", workaround: "chain restaurants and delivery apps", place: "neighbourhood pages and local food groups", hire: "a barista", examples: ["a specialty coffee shop", "a small neighbourhood bakery", "a casual ramen bar"] },
    { segmentNames: ["Home cooks", "Health eaters", "Gift buyers", "Small cafes", "Grocers"], situation: "you wanted a better version of something you eat every week and could not find it", cost: "I settled for the usual mass-produced one", workaround: "whatever the supermarket stocks", place: "food communities and farmers' markets", hire: "a packer", examples: ["a small-batch hot sauce brand", "a line of gluten-free baking mixes", "a cold-brew coffee subscription"] },
  ],
  // Retail and e-commerce
  [
    { segmentNames: ["Market sellers", "Online sellers", "Boutique stores", "Retail chains", "Brands"], situation: "an item sold online that was already out of stock", cost: "I refunded the customer and got a bad review", workaround: "a spreadsheet updated by hand", place: "ecommerce seller communities", hire: "a developer", examples: ["an inventory sync tool for small online shops", "a returns-handling app for boutique stores", "a product-photo generator for sellers"] },
    { segmentNames: ["Online sellers", "Boutique owners", "Brands", "Wholesalers", "Market sellers"], situation: "you needed packing and shipping help and could not keep up", cost: "orders went out days late", workaround: "packing everything at the kitchen table", place: "seller communities and maker groups", hire: "a packer", examples: ["a fulfilment service for small online sellers", "a styling and personal shopping service", "a product-photography service for shops"] },
    { segmentNames: ["Local shoppers", "Gift buyers", "Tourists", "Collectors", "Neighbours"], situation: "you needed something specific and the local shops did not have it", cost: "I drove to three shops and still ordered it online", workaround: "big online marketplaces", place: "neighbourhood pages and collector groups", hire: "a shop assistant", examples: ["a neighbourhood bookshop", "a vintage clothing store", "a board-game and hobby shop"] },
    { segmentNames: ["Gift buyers", "Hobbyists", "Young professionals", "Parents", "Collectors"], situation: "you looked for a good gift or everyday item and everything was generic", cost: "I bought something forgettable", workaround: "the same big marketplaces", place: "maker communities and social media", hire: "a packer", examples: ["handmade candles and home goods", "a line of durable travel bags", "a subscription box for hobbyists"] },
  ],
  // Travel and hospitality
  [
    { segmentNames: ["Small hotels", "Hostels", "Tour operators", "Travel agents", "Hotel groups"], situation: "a room was double booked on a busy weekend", cost: "we paid to put the guest up elsewhere", workaround: "a spreadsheet and three booking sites", place: "hospitality owner groups", hire: "a developer", examples: ["a booking sync tool for small hotels", "a trip-planning app for groups", "a check-in app for guest houses"] },
    { segmentNames: ["Solo travellers", "Couples", "Families", "Work travellers", "Tour groups"], situation: "you planned a trip and the details fell apart on the way", cost: "we lost a day and paid extra to fix it", workaround: "a dozen browser tabs and a group chat", place: "travel communities and expat groups", hire: "a guide", examples: ["a custom itinerary planning service", "a local walking-tour company", "a corporate retreat planning service"] },
    { segmentNames: ["Backpackers", "Couples", "Families", "Work travellers", "Tour groups"], situation: "you needed somewhere good to stay and the choices were overpriced or grim", cost: "I slept badly and the trip started wrong", workaround: "big hotel chains and random listings", place: "travel groups and local tourism pages", hire: "a receptionist", examples: ["a small boutique guesthouse", "a hostel with a coworking space", "a campsite with cabins"] },
    { segmentNames: ["Travellers", "Backpackers", "Families", "Gift buyers", "Outdoor fans"], situation: "you packed for a trip and your gear let you down", cost: "I bought a replacement at the airport at triple the price", workaround: "whatever was cheapest online", place: "travel and outdoor communities", hire: "a packer", examples: ["a compact travel organiser kit", "a line of lightweight daypacks", "a travel gift box"] },
  ],
  // Real estate and home
  [
    { segmentNames: ["Solo landlords", "Small agencies", "Property managers", "Developers", "Housing groups"], situation: "a maintenance request got lost between the tenant and the plumber", cost: "the leak got worse and the repair cost tripled", workaround: "texts, emails and a notebook", place: "landlord associations and property forums", hire: "a developer", examples: ["a maintenance request tracker for landlords", "a viewing scheduler for small agencies", "a tenant screening tool"] },
    { segmentNames: ["Homeowners", "Landlords", "Buyers", "Sellers", "Property managers"], situation: "you needed to fix or sell a property and could not find someone reliable", cost: "the sale dragged on for months", workaround: "word of mouth and cold calls", place: "homeowner groups and local property pages", hire: "an agent", examples: ["a property management service for landlords", "a home staging and selling service", "a renovation project management service"] },
    { segmentNames: ["First-time buyers", "Landlords", "Renters", "Investors", "Tradespeople"], situation: "you needed to see homes or materials and the options were far away or limited", cost: "I wasted two weekends driving around", workaround: "big agencies and online listings", place: "neighbourhood pages and property groups", hire: "a receptionist", examples: ["a neighbourhood real-estate office", "a home-improvement showroom", "a tool-hire shop"] },
    { segmentNames: ["Homeowners", "Renters", "Landlords", "New movers", "DIY hobbyists"], situation: "you wanted to improve your home and everything looked generic or flimsy", cost: "I bought a cheap thing that broke in a month", workaround: "big-box stores", place: "home and DIY communities", hire: "a packer", examples: ["a modular storage system for small flats", "a line of smart home-sensor kits", "a move-in essentials box"] },
  ],
  // Pets and animals
  [
    { segmentNames: ["Dog walkers", "Groomers", "Small vets", "Pet sitters", "Shelters"], situation: "a booking got mixed up and a client's dog was left waiting", cost: "I lost the client and apologised for a week", workaround: "a paper diary and a lot of texts", place: "pet-business groups and vet forums", hire: "a developer", examples: ["a booking and payments app for dog walkers", "a records app for small vet clinics", "a volunteer scheduler for animal shelters"] },
    { segmentNames: ["New pet owners", "Busy professionals", "Dog owners", "Cat owners", "Travellers"], situation: "you had to go away and could not find anyone to look after the pet", cost: "I cancelled my plans", workaround: "asking friends for favours", place: "local pet owner groups", hire: "a handler", examples: ["a dog-walking and pet-sitting service", "a mobile grooming service", "a puppy training service"] },
    { segmentNames: ["Dog owners", "Cat owners", "New pet owners", "Families", "Pet professionals"], situation: "you wanted somewhere to take the pet and the options were cramped or far away", cost: "the dog stayed indoors all day again", workaround: "the one crowded park nearby", place: "local pet owner groups and dog parks", hire: "a handler", examples: ["a dog day-care and boarding centre", "a pet-friendly cafe", "a pet grooming salon"] },
    { segmentNames: ["Dog owners", "Cat owners", "New pet owners", "Gift buyers", "Small breeders"], situation: "you wanted better food or gear for your pet and nothing fit", cost: "the pet refused it and I wasted the money", workaround: "the standard supermarket brands", place: "pet communities and breed groups", hire: "a packer", examples: ["a fresh dog-food subscription", "a line of durable chew toys", "a cat furniture brand"] },
  ],
  // Entertainment and events
  [
    { segmentNames: ["Event organisers", "Small venues", "Bands and artists", "Promoters", "Festival teams"], situation: "tickets sold out online and the door list was a mess", cost: "we turned away paying guests", workaround: "spreadsheets and a card reader", place: "event organiser and promoter groups", hire: "a developer", examples: ["a ticketing and door-list app for small venues", "a booking tool for local bands", "a volunteer rota app for festivals"] },
    { segmentNames: ["Couples", "Companies", "Parents", "Community groups", "Schools"], situation: "you tried to organise an event and the details swallowed your month", cost: "I stayed up late for a week and it still went wrong", workaround: "a group chat and a spreadsheet", place: "event and wedding groups", hire: "a coordinator", examples: ["a wedding planning service", "a kids' party entertainment service", "a corporate team-event service"] },
    { segmentNames: ["Friends", "Couples", "Families", "Corporate groups", "Students"], situation: "you wanted somewhere fun to go and everything good was booked out or far away", cost: "we watched TV at home again", workaround: "the same cinema and a couple of bars", place: "local events pages and student groups", hire: "a host", examples: ["an escape-room venue", "a small live-music bar", "an indoor mini-golf and arcade"] },
    { segmentNames: ["Parents", "Gift buyers", "Event hosts", "Hobbyists", "Teachers"], situation: "you needed party or event supplies and everything was bland or last-minute", cost: "the party looked thrown together", workaround: "the party aisle at the supermarket", place: "parent groups and event communities", hire: "a packer", examples: ["themed party-in-a-box kits", "a board game for family nights", "custom event decorations"] },
  ],
  // Transport and logistics
  [
    { segmentNames: ["Freelance couriers", "Small fleets", "Delivery shops", "Logistics firms", "Warehouses"], situation: "a delivery went to the wrong address", cost: "we redelivered and the customer cancelled", workaround: "phone calls and shared maps", place: "fleet and courier communities", hire: "a developer", examples: ["a route-planning app for small delivery fleets", "a proof-of-delivery app for couriers", "a load-matching tool for freight drivers"] },
    { segmentNames: ["Small shops", "Online sellers", "Offices", "Restaurants", "Event hosts"], situation: "you needed something moved fast and nobody was available", cost: "the order missed its deadline", workaround: "calling around and paying a premium", place: "local business groups", hire: "a driver", examples: ["a same-day local courier service", "a moving and haulage service", "a medical-supplies delivery service"] },
    { segmentNames: ["Local shops", "Online sellers", "Commuters", "Cyclists", "Small fleets"], situation: "you needed a place to store, repair or collect and nothing was nearby", cost: "I lost half a day crossing town", workaround: "a rented unit across the city", place: "local business groups and cycling clubs", hire: "a mechanic", examples: ["a bicycle repair and storage hub", "a neighbourhood parcel pickup point", "a small self-storage facility"] },
    { segmentNames: ["Cyclists", "Commuters", "Small fleets", "Delivery riders", "Outdoor fans"], situation: "your commute gear or vehicle accessories kept failing", cost: "I was late and soaked again", workaround: "cheap accessories from the big shops", place: "commuter and cycling communities", hire: "a packer", examples: ["a waterproof pannier line", "a bike-lock and light set", "a delivery-rider kit"] },
  ],
  // Beauty and personal care
  [
    { segmentNames: ["Solo stylists", "Barbers", "Small salons", "Spas", "Salon groups"], situation: "a client did not turn up and the chair sat empty", cost: "I lost an hour of income", workaround: "a paper book and text reminders", place: "stylist and salon owner groups", hire: "a developer", examples: ["a booking and reminder app for stylists", "a loyalty app for barbershops", "a product-ordering tool for salons"] },
    { segmentNames: ["Busy professionals", "Brides", "Older adults", "Parents", "Event guests"], situation: "you needed to look good for an occasion and could not get an appointment", cost: "I went with a rushed job", workaround: "walk-ins and whoever had a slot", place: "local beauty groups and bridal networks", hire: "a stylist", examples: ["a mobile hair and makeup service", "a barber that visits offices", "a nail and brow home service"] },
    { segmentNames: ["Local regulars", "Office workers", "Brides", "Students", "Tourists"], situation: "you wanted a good salon nearby and the wait was weeks or the quality was poor", cost: "I put it off another month", workaround: "the chain salon down the road", place: "neighbourhood pages and local beauty groups", hire: "a stylist", examples: ["a neighbourhood barbershop", "a nail and beauty salon", "a spa with massage rooms"] },
    { segmentNames: ["Skincare fans", "Busy professionals", "Gift buyers", "Parents", "Teens"], situation: "you tried a skincare product and it did nothing or irritated your skin", cost: "I wasted the money and my skin got worse", workaround: "trial and error with drugstore brands", place: "skincare communities and beauty forums", hire: "a packer", examples: ["a gentle skincare line for sensitive skin", "a natural hair-care range", "a men's grooming subscription"] },
  ],
];

/** Every industry and model, with its short names. */
export const COMBOS: readonly (readonly Combo[])[] = RAW.map((row, i) => row.map((c, m) => ({ ...c, kinds: KINDS[i]?.[m] ?? [] })));

/** The player's choice: a model, and an idea in their own words. */
export interface BusinessChoice {
  readonly model: number;
  readonly idea: string;
  /** The player's own version of who the customers are and what they say: anything left out comes from the pack. */
  readonly custom?: Custom;
}

export interface Custom {
  /** Up to five customer groups, smallest and easiest to reach first. */
  readonly segmentNames?: readonly string[];
  readonly situation?: string;
  readonly cost?: string;
  readonly workaround?: string;
}

export const MAX_LINE = 80;
export const MAX_GROUP = 28;

/** Tidy one line of the player's own words: letters, digits and common punctuation, no markup. */
export function cleanLine(raw: unknown, max = MAX_LINE): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/[^\p{L}\p{N} .,'&/+-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, max).trim();
  return s.length >= 3 ? s : null;
}

/** The player's customisation, tidied and checked; null when there is nothing in it. */
export function cleanCustom(c: Custom | undefined): Custom | undefined {
  if (!c) return undefined;
  const groups = (Array.isArray(c.segmentNames) ? c.segmentNames : []).map((g) => cleanLine(g, MAX_GROUP)).filter((g): g is string => g !== null).slice(0, 5);
  const out: { segmentNames?: string[]; situation?: string; cost?: string; workaround?: string } = {};
  if (groups.length >= 3) out.segmentNames = groups;
  for (const k of ["situation", "cost", "workaround"] as const) {
    const v = typeof c[k] === "string" ? cleanLine(c[k] as string) : null;
    if (v) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** A business as the sim and the UI use it: the combo for this industry and model, with the player's idea. */
export interface Business extends Combo {
  readonly model: ModelInfo;
  /** The idea, as the player wrote it, as a noun phrase. */
  readonly idea: string;
}

export const MAX_IDEA = 60;

/** Tidy an idea: letters, digits and common punctuation only, one space between words, at most MAX_IDEA characters. */
export function cleanIdea(raw: string): string | null {
  const s = raw
    .replace(/[^\p{L}\p{N} .,'&/+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_IDEA)
    .trim();
  return s.length >= 3 ? s : null;
}

export function businessFor(industry: number | null, choice: BusinessChoice | null): Business | null {
  if (industry === null || choice === null) return null;
  const combo = COMBOS[industry]?.[choice.model];
  const model = MODELS[choice.model];
  const idea = cleanIdea(choice.idea);
  if (!combo || !model || !idea) return null;
  const custom = cleanCustom(choice.custom);
  return { ...combo, ...(custom?.segmentNames ? { segmentNames: custom.segmentNames } : {}), ...(custom?.situation ? { situation: custom.situation } : {}), ...(custom?.cost ? { cost: custom.cost } : {}), ...(custom?.workaround ? { workaround: custom.workaround } : {}), model, idea };
}

/** "a gym, a yoga studio or a physiotherapy clinic". */
export function listKinds(kinds: readonly string[]): string {
  return kinds.length <= 1 ? (kinds[0] ?? "") : `${kinds.slice(0, -1).join(", ")} or ${kinds[kinds.length - 1]}`;
}

/** The description of a business model for an industry, with that industry's own examples. */
export function describeModel(industry: number, model: number): string {
  return (MODELS[model]?.blurb ?? "").replace("{kinds}", listKinds(COMBOS[industry]?.[model]?.kinds ?? []));
}

const STOP = new Set(["a", "an", "the", "for", "and", "with", "that", "of", "to", "in", "on", "my", "small", "new", "local", "your", "app", "service", "tool"]);
const tokens = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => (w.length > 3 ? w.replace(/s$/, "") : w));

/**
 * Which industry and business model an idea sounds most like, by the words it shares with the examples and kinds of
 * business in each pack. It only suggests: the player decides. Null when nothing matches better than the current choice.
 */
export function matchPack(idea: string, currentIndustry: number, currentModel: number): { industry: number; model: number } | null {
  const words = tokens(idea);
  if (words.length === 0) return null;
  const score = (industry: number, model: number): number => {
    const c = COMBOS[industry]?.[model];
    if (!c) return 0;
    const bag = new Set([...c.kinds, ...c.examples].flatMap(tokens));
    return words.filter((w) => bag.has(w)).length;
  };
  const here = score(currentIndustry, currentModel);
  // The kind of business the player chose is theirs to keep: look for a better market for it first, and only
  // suggest another kind of business when nothing fits this one at all.
  let best = { industry: currentIndustry, model: currentModel, score: here };
  COMBOS.forEach((_row, industry) => {
    const sc = score(industry, currentModel);
    if (sc > best.score) best = { industry, model: currentModel, score: sc };
  });
  if (best.score === 0 || here === 0) {
    COMBOS.forEach((row, industry) => row.forEach((_c, model) => {
      const sc = score(industry, model);
      if (sc > best.score) best = { industry, model, score: sc };
    }));
  }
  return best.industry === currentIndustry && best.model === currentModel ? null : { industry: best.industry, model: best.model };
}
