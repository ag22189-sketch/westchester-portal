import { useState } from "react";
import ListingsPanel from "./ListingsPanel";

const towns = [
  {
    name: "Irvington",
    tagline: "Hudson River charm, creative community",
    pinned: true,
    metro: 42,
    medianPrice: 1050000,
    taxRate: 2.8,
    schools: 9,
    walkability: 72,
    vibe: "Artistic village, young families, stunning river views",
    dining: 4,
    clubs: ["Sleepy Hollow CC (5 min)", "Ardsley CC (10 min)"],
    highlights: ["Metro-North Hudson Line", "Village feel", "Top elementary schools", "Hudson River access"],
    color: "#C9A96E",
    hospitals: [
      { name: "Phelps Hospital (Northwell)", distance: "8 min", rating: "High Performing", note: "Part of Northwell Health system" },
      { name: "Westchester Medical Center", distance: "18 min", rating: "★ Level 1 Trauma", note: "Best hospital in Westchester, academic medical center" },
      { name: "White Plains Hospital (Montefiore)", distance: "22 min", rating: "High Performing", note: "Strong ER & maternity" },
    ],
    population: 6700,
    density: "Village — very tight-knit",
    demographics: { white: 78, hispanic: 10, asian: 7, black: 3, other: 2 },
    religion: "Diverse — Catholic, Protestant, Jewish, secular mix. St. Barnabas Episcopal & Irvington Presbyterian are community anchors.",
    voting: { dem: 72, rep: 26 },
    editorial: "Irvington is the river town that has it all figured out. It's small enough to feel like a secret, beautiful enough to stop you mid-step on a Tuesday morning, and culturally rich in a way that feels earned rather than curated. The Main Street is modest — a few restaurants, a coffee shop, the kind of bookstore that still hosts readings — but the waterfront parks are genuinely world-class. Young families with taste are discovering what longtime residents have known for decades: this is the best village on the Hudson.",
    history: "Named for Washington Irving, who wrote The Legend of Sleepy Hollow while living at his nearby estate, Sunnyside. The village was incorporated in 1872 and has long attracted writers, artists, and intellectuals drawn to the dramatic Hudson River setting.",
    notableResidents: ["Washington Irving (author)", "Brian De Palma (director)", "Héctor Elizondo (actor)"],
    events: ["Irvington Halloween Festival", "Waterfront Park Concert Series", "Main Street Mile Race", "Holiday Luminaria Walk", "Irvington Farmers Market (Sundays)"],
    highSchool: {
      name: "Irvington High School",
      mascot: "Bulldogs",
      colors: "Blue & White",
      sports: ["Soccer (strong)", "Track & Field", "Tennis", "Basketball", "Lacrosse"],
      arts: ["Award-winning drama program", "Strong orchestral music", "Visual arts AP program"],
    },
    brokerages: [
      { firm: "Houlihan Lawrence", note: "Dominant river towns firm — deepest listing inventory in Irvington", agents: [
        { name: "Lisa Bucolo", phone: "9144199401", email: "lbucolo@houlihanlawrence.com", specialty: "Irvington village specialist, top producer" },
        { name: "Andrea Giordano", phone: "9145889057", email: "agiordano@houlihanlawrence.com", specialty: "River town luxury, relocation expert" },
      ]},
      { firm: "Compass", note: "Growing fast in the river towns — strong digital marketing", agents: [
        { name: "Erin Connolly", phone: "9145880444", email: "erin.connolly@compass.com", specialty: "Irvington & Dobbs Ferry, young family relocations" },
      ]},
      { firm: "Coldwell Banker Realty", note: "National brand with strong local presence", agents: [
        { name: "Debra Dalton", phone: "9149806646", email: "debra.dalton@cbrealty.com", specialty: "River towns veteran, pricing strategist" },
      ]},
    ],
  },
  {
    name: "Hastings-on-Hudson",
    tagline: "Bohemian river town, fiercely loved",
    metro: 36,
    medianPrice: 850000,
    taxRate: 3.0,
    schools: 8,
    walkability: 70,
    vibe: "Artsy, progressive, tight-knit, deeply community-oriented",
    dining: 3,
    clubs: ["Ardsley CC (nearby)", "Sleepy Hollow CC (nearby)"],
    highlights: ["Strong arts community", "River access & trails", "Very loyal residents", "Just south of Dobbs Ferry"],
    color: "#A8C5A0",
    hospitals: [
      { name: "Phelps Hospital (Northwell)", distance: "12 min", rating: "High Performing", note: "Part of Northwell Health system" },
      { name: "Westchester Medical Center", distance: "20 min", rating: "★ Level 1 Trauma", note: "Best hospital in Westchester" },
      { name: "NewYork-Presbyterian/Lawrence", distance: "18 min", rating: "High Performing", note: "Strong cardiac & ortho" },
    ],
    population: 7800,
    density: "Village — very small, everyone knows everyone",
    demographics: { white: 82, hispanic: 8, asian: 5, black: 3, other: 2 },
    religion: "Progressive & secular leaning. Strong Unitarian presence. Some Catholic & Jewish community.",
    voting: { dem: 78, rep: 20 },
    editorial: "Hastings is the town people move to and never leave. It's bohemian without being precious, progressive without being performative, and fiercely loyal to its own identity. The arts community is real — working artists, not weekend painters — and the village has a warmth that's hard to manufacture. The river views are spectacular but understated, the schools are strong without the pressure-cooker energy of wealthier neighbors. If Irvington is the polished gem, Hastings is the rough-cut diamond that insiders covet.",
    history: "Once home to the Anaconda Wire and Cable Company, which shaped the village's working-class identity. The waterfront has undergone significant environmental remediation and is being reimagined as public parkland. The town has attracted artists and intellectuals since the early 20th century.",
    notableResidents: ["Jonathan Demme (director)", "William Hurt (actor)", "Jacques d'Amboise (ballet dancer)"],
    events: ["Hastings Flea Market", "Draper Park Arts Festival", "Harvest Festival", "Village-wide Yard Sale", "Summer Concert Series at MacEachron Park"],
    highSchool: {
      name: "Hastings High School",
      mascot: "Yellow Jackets",
      colors: "Yellow & Black",
      sports: ["Cross Country", "Soccer", "Basketball", "Track & Field", "Softball"],
      arts: ["Nationally recognized theater program", "Strong jazz ensemble", "Film & media arts"],
    },
    brokerages: [
      { firm: "Houlihan Lawrence", note: "Market leader — handles the most transactions in Hastings", agents: [
        { name: "Carolyn Joy", phone: "9145880444", email: "cjoy@houlihanlawrence.com", specialty: "Hastings neighborhood expert, multi-decade veteran" },
      ]},
      { firm: "Compass", note: "Strong presence with tech-savvy agents", agents: [
        { name: "Jennifer Roffman", phone: "9145063626", email: "jennifer.roffman@compass.com", specialty: "Hastings & river towns, buyer's advocate" },
      ]},
      { firm: "Coldwell Banker Realty", note: "Reliable national brand with local knowledge", agents: [
        { name: "Ray Magnani", phone: "9146932100", email: "ray.magnani@cbrealty.com", specialty: "Hastings & Dobbs Ferry, investment properties" },
      ]},
    ],
  },
  {
    name: "Dobbs Ferry",
    tagline: "Hudson River, artsy & approachable",
    metro: 38,
    medianPrice: 780000,
    taxRate: 3.1,
    schools: 8,
    walkability: 68,
    vibe: "Creative, unpretentious, river town with rising profile",
    dining: 3,
    clubs: ["Ardsley CC (nearby)", "Sleepy Hollow CC (nearby)"],
    highlights: ["Affordable entry point", "River views", "Growing restaurant scene", "Strong sense of community"],
    color: "#C4A882",
    hospitals: [
      { name: "Phelps Hospital (Northwell)", distance: "10 min", rating: "High Performing", note: "Part of Northwell Health system" },
      { name: "Westchester Medical Center", distance: "18 min", rating: "★ Level 1 Trauma", note: "Best hospital in Westchester" },
      { name: "White Plains Hospital (Montefiore)", distance: "20 min", rating: "High Performing", note: "Strong ER & maternity" },
    ],
    population: 11000,
    density: "Small village — walkable core, residential outskirts",
    demographics: { white: 72, hispanic: 14, asian: 6, black: 6, other: 2 },
    religion: "Mixed — Catholic, Protestant, Jewish. More diverse than neighboring river towns.",
    voting: { dem: 70, rep: 28 },
    editorial: "Dobbs Ferry is the river town that's having a moment — and it knows it. More approachable than Irvington, less quirky than Hastings, it occupies a sweet spot that's attracting young families priced out of Brooklyn who want the river without the attitude. The restaurant scene is growing fast, the community is genuinely diverse, and the waterfront is gorgeous. It's the entry point to the Hudson River lifestyle, and for many buyers, it's all they need.",
    history: "Named for Jeremiah Dobbs, who operated a ferry across the Hudson in the 18th century. During the Revolutionary War, it sat at the boundary between British and American lines. Mercy College is a major local institution.",
    notableResidents: ["Julia Stiles (actress, grew up here)", "August Wilson (playwright, lived here)"],
    events: ["Summer Fest on the Waterfront", "Dobbs Ferry Food & Music Festival", "Memorial Day Parade", "Holiday Tree Lighting", "Waterfront 5K Run"],
    highSchool: {
      name: "Dobbs Ferry High School",
      mascot: "Eagles",
      colors: "Green & White",
      sports: ["Football", "Soccer", "Baseball", "Basketball", "Swimming"],
      arts: ["Growing theater program", "Music department", "Visual arts"],
    },
    brokerages: [
      { firm: "Houlihan Lawrence", note: "Dominant firm in the river corridor — most listings", agents: [
        { name: "Michele Flood", phone: "9145889057", email: "mflood@houlihanlawrence.com", specialty: "Dobbs Ferry specialist, strong negotiator" },
      ]},
      { firm: "Compass", note: "Rapidly gaining share with younger buyers", agents: [
        { name: "Erin Connolly", phone: "9145880444", email: "erin.connolly@compass.com", specialty: "Dobbs Ferry & Irvington, first-time buyers" },
      ]},
      { firm: "Coldwell Banker Realty", note: "Deep bench of experienced agents", agents: [
        { name: "Debra Dalton", phone: "9149806646", email: "debra.dalton@cbrealty.com", specialty: "River towns generalist, decades of experience" },
      ]},
    ],
  },
  {
    name: "Tarrytown",
    tagline: "Historic, scenic, and vibrant",
    metro: 40,
    medianPrice: 890000,
    taxRate: 2.9,
    schools: 8,
    walkability: 74,
    vibe: "Historic river town, diverse, excellent dining, great energy",
    dining: 5,
    clubs: ["Sleepy Hollow CC", "Ardsley CC"],
    highlights: ["Best restaurant scene in area", "Sleepy Hollow CC access", "Hudson River beauty", "Historic architecture"],
    color: "#D4956A",
    hospitals: [
      { name: "Phelps Hospital (Northwell)", distance: "5 min", rating: "High Performing", note: "Literally in Sleepy Hollow next door" },
      { name: "Westchester Medical Center", distance: "16 min", rating: "★ Level 1 Trauma", note: "Best hospital in Westchester" },
      { name: "White Plains Hospital (Montefiore)", distance: "20 min", rating: "High Performing", note: "Strong ER & maternity" },
    ],
    population: 11500,
    density: "Small town — busier than river villages, real Main Street energy",
    demographics: { white: 58, hispanic: 28, asian: 6, black: 6, other: 2 },
    religion: "Most religiously diverse river town. Strong Catholic (including Latino Catholic), Jewish, Protestant communities.",
    voting: { dem: 68, rep: 30 },
    editorial: "Tarrytown is the one that surprises people. It has the best restaurant scene of any river town — not just good-for-the-suburbs good, but genuinely excellent. The architecture is historic and varied, the Main Street has real energy, and the diversity gives it a texture that more homogeneous villages can't replicate. The Tappan Zee Bridge views are cinematic. Tarrytown is where you go when you want a river town that actually feels like a town.",
    history: "Tarrytown's history is inseparable from the legend of Sleepy Hollow — Washington Irving set his famous tale here. The village is home to Lyndhurst, a Gothic Revival mansion and National Trust site. The Mario M. Cuomo Bridge (formerly Tappan Zee) connects here to Rockland County.",
    notableResidents: ["Washington Irving (author, Sunnyside estate)", "John D. Rockefeller (nearby Pocantico Hills)"],
    events: ["Tarrytown Music Hall Season", "Jazz Forum Arts Concerts", "TaSH (Tarrytown & Sleepy Hollow) Farmers Market", "Sleepy Hollow Cemetery Tours", "Rivertown Film Festival"],
    highSchool: {
      name: "Sleepy Hollow High School (shared with Sleepy Hollow)",
      mascot: "Horsemen",
      colors: "Red & Blue",
      sports: ["Football (strong)", "Soccer", "Track & Field", "Baseball", "Wrestling"],
      arts: ["Theater productions", "Band & orchestra", "Visual arts program"],
    },
    brokerages: [
      { firm: "Houlihan Lawrence", note: "Tarrytown market leader — strongest listing presence", agents: [
        { name: "Candida Rosa Ellis", phone: "9145889057", email: "cellis@houlihanlawrence.com", specialty: "Tarrytown & Sleepy Hollow, bilingual (English/Spanish)" },
        { name: "Grace Vasta", phone: "9145889057", email: "gvasta@houlihanlawrence.com", specialty: "River towns luxury, staging expert" },
      ]},
      { firm: "Compass", note: "Growing presence in the Tarrytown market", agents: [
        { name: "Maria Camaj", phone: "9148195730", email: "maria.camaj@compass.com", specialty: "Tarrytown village, new development specialist" },
      ]},
      { firm: "Coldwell Banker Realty", note: "Established brand with local expertise", agents: [
        { name: "Steve Welles", phone: "9146312727", email: "steve.welles@cbrealty.com", specialty: "Tarrytown & river towns, veteran agent" },
      ]},
    ],
  },
  {
    name: "Sleepy Hollow",
    tagline: "Iconic, river-front, up-and-coming",
    metro: 41,
    medianPrice: 720000,
    taxRate: 3.2,
    schools: 7,
    walkability: 65,
    vibe: "Diverse, historic, waterfront revival underway — adjacent to Tarrytown",
    dining: 3,
    clubs: ["Sleepy Hollow CC (in town)", "Ardsley CC (nearby)"],
    highlights: ["Sleepy Hollow CC is right here", "Most affordable river town", "Exciting revitalization", "Next to Tarrytown amenities"],
    color: "#9B8BB4",
    hospitals: [
      { name: "Phelps Hospital (Northwell)", distance: "2 min", rating: "High Performing", note: "Literally in town — best hospital access of any river town" },
      { name: "Westchester Medical Center", distance: "15 min", rating: "★ Level 1 Trauma", note: "Best hospital in Westchester" },
    ],
    population: 10000,
    density: "Small town — denser than villages, waterfront revival underway",
    demographics: { white: 42, hispanic: 48, asian: 4, black: 4, other: 2 },
    religion: "Predominantly Catholic — large Latino Catholic community. Growing secular/mixed population as gentrification continues.",
    voting: { dem: 62, rep: 36 },
    editorial: "Sleepy Hollow is the bet. It's the most affordable river town, it's adjacent to Tarrytown's amenities, and the waterfront redevelopment underway will fundamentally change its profile over the next decade. The GM assembly plant site is being transformed into a massive mixed-use development. The diversity is genuine, the history is iconic (the Headless Horseman literally lives here), and Phelps Hospital is a two-minute drive. For buyers who can see five years ahead, this is the play.",
    history: "Originally North Tarrytown, the village renamed itself Sleepy Hollow in 1996 to honor Washington Irving's famous story. Home to the Old Dutch Church (1685) and Sleepy Hollow Cemetery, where Irving, Andrew Carnegie, and William Rockefeller are buried. The former GM plant is being redeveloped into Edge-on-Hudson.",
    notableResidents: ["Andrew Carnegie (buried here)", "William Rockefeller (buried here)", "Elizabeth Arden (Sleepy Hollow Cemetery)"],
    events: ["The Great Jack O'Lantern Blaze", "Sleepy Hollow Cemetery Tours", "Horseman's Hollow (Halloween)", "Edge-on-Hudson Waterfront Events", "Headless Horseman 10K"],
    highSchool: {
      name: "Sleepy Hollow High School (shared with Tarrytown)",
      mascot: "Horsemen",
      colors: "Red & Blue",
      sports: ["Football", "Soccer", "Track & Field", "Baseball", "Wrestling"],
      arts: ["Theater", "Band & orchestra", "Visual arts"],
    },
    brokerages: [
      { firm: "Houlihan Lawrence", note: "Dominant in Sleepy Hollow — handles most of Edge-on-Hudson", agents: [
        { name: "Candida Rosa Ellis", phone: "9145889057", email: "cellis@houlihanlawrence.com", specialty: "Bilingual specialist, Edge-on-Hudson expert" },
      ]},
      { firm: "Compass", note: "Active in the new development market", agents: [
        { name: "Maria Camaj", phone: "9148195730", email: "maria.camaj@compass.com", specialty: "New construction & waterfront development" },
      ]},
      { firm: "Coldwell Banker Realty", note: "Strong in the broader Tarrytown/SH area", agents: [
        { name: "Steve Welles", phone: "9146312727", email: "steve.welles@cbrealty.com", specialty: "Sleepy Hollow resales, long-time local" },
      ]},
    ],
  },
  {
    name: "Ardsley",
    tagline: "Quiet, excellent schools, underrated",
    metro: 42,
    medianPrice: 750000,
    taxRate: 2.9,
    schools: 9,
    walkability: 55,
    vibe: "Low-key, family-first, excellent schools without the Scarsdale price tag",
    dining: 2,
    clubs: ["Ardsley CC (in town)", "Sleepy Hollow CC (nearby)"],
    highlights: ["Ardsley CC is right here", "Top-rated schools", "Very affordable for quality", "Quiet & safe"],
    color: "#7E9E9F",
    hospitals: [
      { name: "Westchester Medical Center", distance: "10 min", rating: "★ Level 1 Trauma", note: "Closest town to WMC — best trauma access" },
      { name: "White Plains Hospital (Montefiore)", distance: "15 min", rating: "High Performing", note: "Strong ER & maternity" },
      { name: "Phelps Hospital (Northwell)", distance: "14 min", rating: "High Performing", note: "Part of Northwell system" },
    ],
    population: 9100,
    density: "Small suburb — quiet residential, no real walkable downtown",
    demographics: { white: 74, hispanic: 8, asian: 14, black: 2, other: 2 },
    religion: "Mix of Catholic, Jewish, and Protestant. Notable Jewish community. Quiet, not congregation-centric.",
    voting: { dem: 65, rep: 33 },
    editorial: "Ardsley is the quiet achiever. Nobody brags about living in Ardsley, and that's precisely the point. The schools rival Scarsdale at a fraction of the price, the country club is right in town, and the proximity to Westchester Medical Center is unmatched. It doesn't have a charming Main Street or river views — what it has is substance. For families who care about education and value over prestige, Ardsley is the smartest buy in central Westchester.",
    history: "Originally part of the Town of Greenburgh, Ardsley was incorporated as a village in 1896. Named after Ardsley-on-Hudson, the estate of Cyrus W. Field, who laid the first transatlantic telegraph cable. The Saw Mill River Parkway runs through town.",
    notableResidents: ["Cyrus W. Field (telegraph pioneer)", "Roberta Peters (opera singer)"],
    events: ["Ardsley Day", "Memorial Day Parade", "Summer Concert Series", "Ardsley Education Foundation Gala", "Village Holiday Celebration"],
    highSchool: {
      name: "Ardsley High School",
      mascot: "Panthers",
      colors: "Blue & Gold",
      sports: ["Soccer (state contender)", "Track & Field", "Basketball", "Tennis", "Swimming"],
      arts: ["Strong music program", "Theater productions", "Art exhibitions"],
    },
    brokerages: [
      { firm: "Houlihan Lawrence", note: "Strong presence in central Westchester", agents: [
        { name: "Maria Patalano", phone: "9146932100", email: "mpatalano@houlihanlawrence.com", specialty: "Ardsley & Dobbs Ferry, family-focused" },
      ]},
      { firm: "Compass", note: "Growing share with relocating families", agents: [
        { name: "Dana Brockman", phone: "9149807832", email: "dana.brockman@compass.com", specialty: "Ardsley schools expert, buyer's agent" },
      ]},
      { firm: "Coldwell Banker Realty", note: "Reliable coverage in the Rivertowns corridor", agents: [
        { name: "Ray Magnani", phone: "9146932100", email: "ray.magnani@cbrealty.com", specialty: "Ardsley & Greenburgh, multi-family specialist" },
      ]},
    ],
  },
  {
    name: "Chappaqua",
    tagline: "Top schools, leafy, aspirational",
    metro: 52,
    medianPrice: 1100000,
    taxRate: 2.5,
    schools: 10,
    walkability: 52,
    vibe: "Prestigious, wooded, known for exceptional schools and established families",
    dining: 3,
    clubs: ["Whippoorwill Club", "Briar Hall CC"],
    highlights: ["Among best schools in NY state", "Beautiful wooded setting", "Strong resale value", "Quiet & private"],
    color: "#8B9EB7",
    hospitals: [
      { name: "Northern Westchester Hospital (Northwell)", distance: "15 min", rating: "High Performing", note: "Excellent community hospital, highly rated" },
      { name: "Westchester Medical Center", distance: "20 min", rating: "★ Level 1 Trauma", note: "Best hospital in Westchester" },
      { name: "White Plains Hospital (Montefiore)", distance: "25 min", rating: "High Performing", note: "Strong ER & maternity" },
    ],
    population: 9500,
    density: "Suburban village — wooded, spread out, car dependent",
    demographics: { white: 80, hispanic: 5, asian: 12, black: 2, other: 1 },
    religion: "Strong Jewish community — multiple synagogues. Catholic & Protestant also well represented. Very active congregational life.",
    voting: { dem: 66, rep: 32 },
    editorial: "Chappaqua is the school play. If education is your single highest priority — and for many families it is — Chappaqua ends the conversation. The Chappaqua Central School District routinely ranks among the best in New York State, and the community is organized around that fact. The town itself is wooded and private, more Connecticut than Westchester in feel. The commute is longer, the dining is modest, but the families here chose this life deliberately and would choose it again.",
    history: "The name comes from the Quaker word 'shapaqua' meaning 'the rustling land.' Originally a Quaker settlement, it became famous as the home of Horace Greeley, the newspaper editor who said 'Go West, young man.' More recently known as the home of Bill and Hillary Clinton, who purchased their house here in 1999.",
    notableResidents: ["Bill & Hillary Clinton", "Horace Greeley (newspaper editor)", "Vanessa Williams (singer/actress)"],
    events: ["Chappaqua Children's Book Festival", "Greeley Farm & Garden Market", "Memorial Day Parade", "New Castle Historical Society Events", "ChappPride Community Day"],
    highSchool: {
      name: "Horace Greeley High School",
      mascot: "Quakers",
      colors: "Blue & White",
      sports: ["Lacrosse (powerhouse)", "Soccer", "Tennis", "Swimming", "Cross Country"],
      arts: ["Exceptional theater program", "Award-winning concert band", "AP Studio Art", "Film production"],
    },
    brokerages: [
      { firm: "Ginnel Real Estate", note: "#1 in northern Westchester — hyper-local, community embedded", agents: [
        { name: "Carolyn Lowe", phone: "9142323700", email: "carolyn@ginnel.com", specialty: "Chappaqua village specialist, top producer" },
        { name: "Pollena Forsman", phone: "9142323700", email: "pollena@ginnel.com", specialty: "New Castle expert, school district knowledge" },
      ]},
      { firm: "Houlihan Lawrence", note: "Strong #2 with deep northern Westchester coverage", agents: [
        { name: "Arlene Gibson", phone: "9142386363", email: "agibson@houlihanlawrence.com", specialty: "Chappaqua luxury, long-time resident" },
      ]},
      { firm: "Julia B. Fee Sotheby's", note: "Luxury brand with strong marketing", agents: [
        { name: "Heather Harrison", phone: "9147157940", email: "heather.harrison@juliabfee.com", specialty: "High-end Chappaqua & Bedford, global reach" },
      ]},
    ],
  },
  {
    name: "Bedford",
    tagline: "Estates, horses, and old-world elegance",
    metro: 65,
    medianPrice: 1650000,
    taxRate: 1.9,
    schools: 9,
    walkability: 30,
    vibe: "Grand estates, equestrian culture, serious privacy and land",
    dining: 2,
    clubs: ["Bedford Golf & Tennis Club", "Mianus River GC", "Hamilton Farm (nearby)"],
    highlights: ["Most land for the money", "Lowest tax rate in area", "True estate living", "Horse country"],
    color: "#B07D62",
    hospitals: [
      { name: "Northern Westchester Hospital (Northwell)", distance: "20 min", rating: "High Performing", note: "Your go-to community hospital" },
      { name: "Greenwich Hospital (Yale-NHH)", distance: "25 min", rating: "High Performing", note: "Excellent option just over CT border" },
      { name: "Westchester Medical Center", distance: "35 min", rating: "★ Level 1 Trauma", note: "Further but best for serious care" },
    ],
    population: 18000,
    density: "Township — very spread out, estates on large lots, no real town center",
    demographics: { white: 88, hispanic: 6, asian: 3, black: 2, other: 1 },
    religion: "Old-money Protestant historically — Episcopal & Presbyterian. Jewish community present. Generally private about faith.",
    voting: { dem: 58, rep: 40 },
    editorial: "Bedford is where Westchester becomes an estate. The lots are measured in acres, not square feet. Horses outnumber restaurants. The tax rate is the lowest in the area because the land values do the heavy lifting. This isn't suburban living — it's country living with a Metro-North line. Martha Stewart built her empire from here, and the aesthetic tracks: manicured but never fussy, grand but never gaudy. Bedford is for buyers who want space, privacy, and the quiet confidence that comes with both.",
    history: "One of the oldest settlements in Westchester, Bedford was founded in 1680. During the Revolutionary War, the village was burned by the British in 1779. Bedford Village retains its colonial character with a historic courthouse and village green. The town encompasses several hamlets including Bedford Hills and Bedford Corners.",
    notableResidents: ["Martha Stewart", "Ralph Lauren", "Glenn Close (actress)", "Ryan Reynolds & Blake Lively"],
    events: ["Bedford Farmers Market", "Bedford Historical Society Events", "Horse Shows at Guard Hill", "Bedford Audubon Society Walks", "Bedford 2020 Community Events"],
    highSchool: {
      name: "Fox Lane High School",
      mascot: "Foxes",
      colors: "Red & White",
      sports: ["Equestrian (unique program)", "Lacrosse", "Soccer", "Field Hockey", "Track & Field"],
      arts: ["Strong visual arts", "Theater program", "Music ensembles", "Creative writing"],
    },
    brokerages: [
      { firm: "Ginnel Real Estate", note: "#1 firm in Bedford — nobody knows the estates better", agents: [
        { name: "Peter Klemm", phone: "9142343700", email: "peter@ginnel.com", specialty: "Bedford estates & horse properties, top producer" },
        { name: "Lisa Bucolo", phone: "9142343700", email: "lisa@ginnel.com", specialty: "Guard Hill & Bedford Village, luxury specialist" },
      ]},
      { firm: "Houlihan Lawrence", note: "Strong coverage across northern Westchester", agents: [
        { name: "Maria Makaj", phone: "9142342820", email: "mmakaj@houlihanlawrence.com", specialty: "Bedford luxury, estate properties" },
      ]},
      { firm: "Julia B. Fee Sotheby's", note: "Global luxury brand, excellent for high-end listings", agents: [
        { name: "Heather Harrison", phone: "9147157940", email: "heather.harrison@juliabfee.com", specialty: "Estate properties, celebrity/UHNW clients" },
      ]},
    ],
  },
  {
    name: "Katonah",
    tagline: "Charming village, artist colony feel",
    metro: 62,
    medianPrice: 890000,
    taxRate: 2.3,
    schools: 9,
    walkability: 55,
    vibe: "Picturesque New England-style village, arts-forward, relaxed pace",
    dining: 3,
    clubs: ["Whippoorwill Club (nearby)", "Bedford Golf (nearby)"],
    highlights: ["Beautiful historic village", "Arts community", "John Jay Homestead nearby", "Quieter northern Westchester"],
    color: "#C9A96E",
    hospitals: [
      { name: "Northern Westchester Hospital (Northwell)", distance: "12 min", rating: "High Performing", note: "Your primary hospital — well regarded" },
      { name: "Westchester Medical Center", distance: "30 min", rating: "★ Level 1 Trauma", note: "Best for serious care" },
    ],
    population: 4500,
    density: "Hamlet — one of the smallest, very village feel",
    demographics: { white: 85, hispanic: 8, asian: 4, black: 2, other: 1 },
    religion: "Quaker history — still has active Friends meeting. Mix of Protestant, Catholic, secular artists.",
    voting: { dem: 60, rep: 38 },
    editorial: "Katonah is the sleeper. It has the charm of a New England village — white clapboard storefronts, a tiny library, the kind of café where everyone knows your order — but it's technically Westchester, with Metro-North access to Grand Central. The Caramoor Center for Music and the Arts brings world-class performances to a town of 4,500 people. The Katonah Museum of Art punches absurdly above its weight. For creative families who want beauty, quiet, and culture without pretension, Katonah is quietly perfect.",
    history: "The original village of Katonah was relocated in the 1890s when the New York City reservoir system flooded the old site. Residents literally moved their houses to the current location. Named after Chief Katonah, a Native American leader. The John Jay Homestead, home of the first Chief Justice, is nearby.",
    notableResidents: ["John Jay (first Chief Justice, homestead nearby)", "Harvey Weinstein (former resident)", "Martha Stewart (nearby)"],
    events: ["Caramoor Summer Music Festival", "Katonah Museum of Art Exhibitions", "Katonah Art Walk", "John Jay Homestead Farm Market", "Bedford/Katonah Lions Club Fair"],
    highSchool: {
      name: "John Jay High School",
      mascot: "Indians",
      colors: "Blue & Orange",
      sports: ["Soccer", "Cross Country", "Lacrosse", "Track & Field", "Tennis"],
      arts: ["Strong music program", "Visual arts", "Theater", "Photography"],
    },
    brokerages: [
      { firm: "Ginnel Real Estate", note: "#1 in Katonah — the local experts", agents: [
        { name: "Carolyn Lowe", phone: "9142323700", email: "carolyn@ginnel.com", specialty: "Katonah village & surrounding area" },
      ]},
      { firm: "Houlihan Lawrence", note: "Strong northern Westchester presence", agents: [
        { name: "Arlene Gibson", phone: "9142386363", email: "agibson@houlihanlawrence.com", specialty: "Katonah & Bedford, school district expert" },
      ]},
      { firm: "Julia B. Fee Sotheby's", note: "Luxury marketing for high-end properties", agents: [
        { name: "Maryann Terenzio", phone: "9147157940", email: "maryann.terenzio@juliabfee.com", specialty: "Northern Westchester luxury, arts community ties" },
      ]},
    ],
  },
  {
    name: "Bronxville",
    tagline: "Prestige, polish, and proximity",
    metro: 30,
    medianPrice: 1450000,
    taxRate: 2.1,
    schools: 10,
    walkability: 78,
    vibe: "Established, prestigious, tight-knit village with old money feel",
    dining: 4,
    clubs: ["Siwanoy CC", "Wykagyl CC (nearby)"],
    highlights: ["30 min to Grand Central", "Top-ranked schools", "Charming walkable village", "Strong community"],
    color: "#7A9E7E",
    hospitals: [
      { name: "NewYork-Presbyterian/Lawrence", distance: "5 min", rating: "High Performing", note: "Right in Bronxville — very convenient" },
      { name: "Montefiore Medical Center", distance: "15 min", rating: "★ Major Academic Center", note: "One of the best in the NY metro area" },
      { name: "Westchester Medical Center", distance: "25 min", rating: "★ Level 1 Trauma", note: "Best hospital in Westchester" },
    ],
    population: 6400,
    density: "Village — one of the most walkable and compact in Westchester",
    demographics: { white: 88, hispanic: 4, asian: 5, black: 2, other: 1 },
    religion: "Historically Protestant — Reformed Church of Bronxville is a landmark. Catholic & Jewish also present. Traditional community feel.",
    voting: { dem: 64, rep: 34 },
    editorial: "Bronxville is the village that needs no introduction — and gives none. At 30 minutes to Grand Central, it has the fastest commute of any serious Westchester town. The village is immaculate, walkable, and unapologetically polished. The school district is tiny and elite. Concordia College adds a collegiate energy. The real estate holds its value like few places in the metro area because demand never wavers. Bronxville is for buyers who want proximity, prestige, and a village that looks like it was art-directed.",
    history: "Developed in the 1890s by William Van Duzer Lawrence, who envisioned a planned community of arts and culture. He founded what became Concordia College and built the Lawrence Hospital. The village's Tudor, Colonial, and Arts & Crafts architecture is remarkably preserved. The Reformed Church of Bronxville, founded in 1850, remains a community cornerstone.",
    notableResidents: ["Kennedy family (Joseph P. Kennedy Sr. raised his family here)", "Amy Fisher", "John Cheever (author, grew up nearby)"],
    events: ["Bronxville Women's Club Events", "Concordia College Concerts", "Village Holiday Walk", "Bronxville School Foundation Gala", "Summer Sidewalk Sale"],
    highSchool: {
      name: "Bronxville High School",
      mascot: "Broncos",
      colors: "Maroon & White",
      sports: ["Soccer (state champions)", "Lacrosse", "Tennis", "Cross Country (dominant)", "Swimming"],
      arts: ["Nationally ranked theater", "Strong orchestra", "Visual arts exhibitions", "Literary magazine"],
    },
    brokerages: [
      { firm: "Compass — Angela Retelny Team", note: "Dominant team in Bronxville — highest volume by far", agents: [
        { name: "Angela Retelny", phone: "9143372478", email: "angela.retelny@compass.com", specialty: "Bronxville village #1 producer, pricing expert" },
        { name: "Sarah Jones", phone: "9143372478", email: "sarah.jones@compass.com", specialty: "Retelny team, buyer specialist" },
      ]},
      { firm: "Houlihan Lawrence", note: "Strong traditional presence in Bronxville", agents: [
        { name: "Liz Brewster", phone: "9143375700", email: "lbrewster@houlihanlawrence.com", specialty: "Bronxville long-time resident, estate specialist" },
      ]},
      { firm: "Julia B. Fee Sotheby's", note: "Luxury marketing, strong in the village", agents: [
        { name: "Robin Berzin", phone: "9147157940", email: "robin.berzin@juliabfee.com", specialty: "Bronxville & Tuckahoe, polished presentation" },
      ]},
    ],
  },
  {
    name: "Scarsdale",
    tagline: "Academic excellence, family-focused",
    metro: 38,
    medianPrice: 1650000,
    taxRate: 2.4,
    schools: 10,
    walkability: 65,
    vibe: "Top-tier schools, established families, leafy suburbs",
    dining: 3,
    clubs: ["Scarsdale Golf Club", "Quaker Ridge GC", "Fenway GC"],
    highlights: ["#1 school district NY", "Strong resale value", "Large lots", "Active parent community"],
    color: "#D4956A",
    hospitals: [
      { name: "White Plains Hospital (Montefiore)", distance: "10 min", rating: "High Performing", note: "Strong ER, maternity, and cancer care" },
      { name: "NewYork-Presbyterian/Lawrence", distance: "12 min", rating: "High Performing", note: "Strong cardiac & ortho programs" },
      { name: "Westchester Medical Center", distance: "18 min", rating: "★ Level 1 Trauma", note: "Best hospital in Westchester" },
    ],
    population: 18000,
    density: "Suburb — larger than most, leafy residential neighborhoods",
    demographics: { white: 68, hispanic: 4, asian: 24, black: 2, other: 2 },
    religion: "Large and active Jewish community — multiple synagogues of all denominations. Also strong Catholic & Protestant. Very congregation-oriented.",
    voting: { dem: 70, rep: 28 },
    editorial: "Scarsdale is the standard. When people outside New York imagine the ideal suburb — top schools, leafy streets, stately homes, involved parents — they're imagining Scarsdale. The school district is consistently ranked #1 in the state, and the community is organized around academic excellence with an intensity that's either inspiring or exhausting, depending on your temperament. The homes are large, the lots are generous, and the resale values are bulletproof. It's not cheap, and it's not trying to be.",
    history: "Named after Caleb Heathcote's estate, Scarsdale was incorporated in 1915. It became synonymous with suburban affluence in the mid-20th century. The Scarsdale Diet, created by cardiologist Herman Tarnower (later murdered by his lover Jean Harris in a sensational 1980 case), briefly made the town internationally famous for something other than property values.",
    notableResidents: ["Liam Neeson (actor)", "Dan Abrams (media personality)", "Robert Merrill (opera singer)"],
    events: ["Scarsdale Sidewalk Sale", "Scarsdale Forum Lectures", "Memorial Day Parade", "Scarsdale Bowl Dinner", "PTA Book Fair"],
    highSchool: {
      name: "Scarsdale High School",
      mascot: "Raiders",
      colors: "Maroon & White",
      sports: ["Tennis (perennial state contender)", "Soccer", "Lacrosse", "Swimming", "Fencing"],
      arts: ["Exceptional orchestra & band", "Award-winning Maroon (newspaper)", "Theater productions", "AP Art History program"],
    },
    brokerages: [
      { firm: "Compass — Angela Retelny Team", note: "Extends Bronxville dominance into Scarsdale", agents: [
        { name: "Angela Retelny", phone: "9143372478", email: "angela.retelny@compass.com", specialty: "Scarsdale luxury, cross-market expertise" },
      ]},
      { firm: "Houlihan Lawrence", note: "Deep Scarsdale presence — most listings", agents: [
        { name: "Myrna Anover", phone: "9147232500", email: "manover@houlihanlawrence.com", specialty: "Scarsdale neighborhoods expert, top producer" },
        { name: "Bonnie Koff", phone: "9147232500", email: "bkoff@houlihanlawrence.com", specialty: "Scarsdale schools specialist, relocation" },
      ]},
      { firm: "Julia B. Fee Sotheby's", note: "Luxury tier for high-end Scarsdale homes", agents: [
        { name: "Barbara Leogrande", phone: "9147157940", email: "barbara.leogrande@juliabfee.com", specialty: "Murray Hill Scarsdale, luxury marketing" },
      ]},
    ],
  },
  {
    name: "Larchmont",
    tagline: "Coastal living, village energy",
    metro: 35,
    medianPrice: 1250000,
    taxRate: 2.6,
    schools: 9,
    walkability: 80,
    vibe: "Waterfront village, boutique shops, young professional families",
    dining: 5,
    clubs: ["Larchmont Yacht Club", "Winged Foot (nearby)"],
    highlights: ["Long Island Sound access", "Most walkable in area", "Vibrant dining scene", "Beach clubs"],
    color: "#A8C5A0",
    hospitals: [
      { name: "NewYork-Presbyterian/Lawrence", distance: "8 min", rating: "High Performing", note: "Strong cardiac & ortho" },
      { name: "Sound Shore Medical (Montefiore)", distance: "10 min", rating: "High Performing", note: "Right on the Sound Shore corridor" },
      { name: "Westchester Medical Center", distance: "25 min", rating: "★ Level 1 Trauma", note: "Best for serious care" },
    ],
    population: 6100,
    density: "Village — very small, tight, walkable waterfront community",
    demographics: { white: 84, hispanic: 5, asian: 7, black: 2, other: 2 },
    religion: "Catholic & Protestant mix. St. Augustine's Catholic is a community anchor. Active Jewish community. Young family vibe in all congregations.",
    voting: { dem: 68, rep: 30 },
    editorial: "Larchmont is the waterfront lifestyle without the waterfront price tag of Rye. Long Island Sound access, a walkable village with genuinely good restaurants, and a community that skews young and energetic. The Larchmont Yacht Club is an institution, but the town doesn't feel stuffy — it feels like the best version of a coastal suburb. The commute is fast, the schools are strong, and the dining scene rivals Tarrytown's. If you want salt air and village charm, Larchmont delivers.",
    history: "Developed in the 1840s as a commuter suburb with the arrival of the New Haven Railroad. The Larchmont Yacht Club, founded in 1880, is one of the most prestigious on Long Island Sound. The Manor House, built in 1797, still stands. Larchmont and Mamaroneck share a school district.",
    notableResidents: ["Norman Rockwell (lived briefly)", "Jane Pauley (news anchor)", "Cynthia Nixon (actress, grew up nearby)"],
    events: ["Larchmont Avenue Arts Festival", "Village Fair & Carnival", "Larchmont Yacht Club Race Week", "Flint Park Concert Series", "Holiday Stroll on Larchmont Avenue"],
    highSchool: {
      name: "Mamaroneck High School (shared district)",
      mascot: "Tigers",
      colors: "Black & Orange",
      sports: ["Soccer (nationally ranked)", "Lacrosse", "Sailing", "Tennis", "Swimming"],
      arts: ["Blue Notes a cappella (nationally known)", "Theater", "Orchestra", "Visual arts"],
    },
    brokerages: [
      { firm: "Julia B. Fee Sotheby's", note: "Dominant Sound Shore brand — strongest in Larchmont", agents: [
        { name: "Pollena Forsman", phone: "9148342900", email: "pollena.forsman@juliabfee.com", specialty: "Larchmont village specialist, top producer" },
        { name: "Catherine Connors", phone: "9148342900", email: "catherine.connors@juliabfee.com", specialty: "Waterfront properties, Larchmont Manor" },
      ]},
      { firm: "Houlihan Lawrence", note: "Strong #2 with broad coverage", agents: [
        { name: "Colleen Sullivan", phone: "9148336600", email: "csullivan@houlihanlawrence.com", specialty: "Larchmont & Mamaroneck, school district expert" },
      ]},
      { firm: "Compass", note: "Growing Sound Shore presence", agents: [
        { name: "Jennifer Leahy", phone: "9148360005", email: "jennifer.leahy@compass.com", specialty: "Larchmont village, design-minded buyers" },
      ]},
    ],
  },
  {
    name: "Rye",
    tagline: "Waterfront elegance, top schools",
    metro: 45,
    medianPrice: 1550000,
    taxRate: 2.2,
    schools: 9,
    walkability: 70,
    vibe: "Gracious, waterfront, established with strong community institutions",
    dining: 4,
    clubs: ["Apawamis Club", "Rye Golf Club", "American Yacht Club"],
    highlights: ["Playland beach access", "Excellent schools", "Strong club culture", "Safe & walkable village"],
    color: "#9B8BB4",
    hospitals: [
      { name: "Greenwich Hospital (Yale-NHH)", distance: "12 min", rating: "High Performing", note: "Excellent just over CT border" },
      { name: "NewYork-Presbyterian/Lawrence", distance: "18 min", rating: "High Performing", note: "Strong programs" },
      { name: "Westchester Medical Center", distance: "30 min", rating: "★ Level 1 Trauma", note: "Best for serious care" },
    ],
    population: 16000,
    density: "Small city feel — larger than villages, real downtown, waterfront",
    demographics: { white: 85, hispanic: 6, asian: 6, black: 2, other: 1 },
    religion: "Strong Catholic & Protestant. Christ's Church Episcopal is a major institution. Jewish community present. Traditional, established feel.",
    voting: { dem: 62, rep: 36 },
    editorial: "Rye is the gold standard of Sound Shore living. The club culture is deep — Apawamis, Rye Golf, American Yacht Club — and the town carries itself with a gracious confidence. Playland is the last government-owned amusement park in the country, and it gives Rye a populist charm that balances the old-money elegance. The schools are excellent, the downtown is walkable and attractive, and the waterfront access is the best in Westchester. Rye is where you move when you've arrived and want everyone to know it, quietly.",
    history: "One of the oldest communities in New York, Rye was purchased from the Siwanoy tribe in 1660. The Jay Heritage Center preserves the home of Founding Father John Jay. Playland, the Art Deco amusement park, opened in 1928 and is a National Historic Landmark. Rye was the first planned amusement park in America.",
    notableResidents: ["John Jay (Founding Father, born in Rye)", "Kevin Bacon & Kyra Sedgwick (actors)", "Ogden Nash (poet, lived in Rye)"],
    events: ["Playland Summer Season", "Rye Arts Center Exhibitions", "Rye Town Park Beach Days", "Rye Historical Society Walking Tours", "Mistletoe Magic Holiday Festival"],
    highSchool: {
      name: "Rye High School",
      mascot: "Garnets",
      colors: "Garnet & White",
      sports: ["Football (strong tradition)", "Lacrosse (powerhouse)", "Field Hockey", "Soccer", "Sailing"],
      arts: ["Acclaimed theater program", "Jazz band", "Visual arts", "Creative writing"],
    },
    brokerages: [
      { firm: "Julia B. Fee Sotheby's", note: "Rye market leader — luxury is their DNA", agents: [
        { name: "Jill Marino", phone: "9149674600", email: "jill.marino@juliabfee.com", specialty: "Rye waterfront, club community specialist" },
        { name: "Suzanne Drangel", phone: "9149674600", email: "suzanne.drangel@juliabfee.com", specialty: "Rye village, multi-generational families" },
      ]},
      { firm: "Houlihan Lawrence", note: "Broad coverage, strong agent bench", agents: [
        { name: "Michelle Kennedy", phone: "9149670600", email: "mkennedy@houlihanlawrence.com", specialty: "Rye & Harrison, top negotiator" },
      ]},
      { firm: "Compass", note: "Gaining ground in the Sound Shore market", agents: [
        { name: "Laura Schaefer", phone: "9149253996", email: "laura.schaefer@compass.com", specialty: "Rye luxury, lifestyle marketing" },
      ]},
    ],
  },
  {
    name: "Pleasantville",
    tagline: "Underrated gem, great value",
    metro: 48,
    medianPrice: 680000,
    taxRate: 3.0,
    schools: 8,
    walkability: 62,
    vibe: "Friendly, diverse village with a real downtown and great value",
    dining: 3,
    clubs: ["Whippoorwill Club (nearby)", "Briar Hall CC (nearby)"],
    highlights: ["Best value in central Westchester", "Walkable village", "Growing restaurant scene", "Good schools"],
    color: "#8B9EB7",
    hospitals: [
      { name: "White Plains Hospital (Montefiore)", distance: "12 min", rating: "High Performing", note: "Strong ER & maternity" },
      { name: "Westchester Medical Center", distance: "15 min", rating: "★ Level 1 Trauma", note: "Best hospital in Westchester" },
      { name: "Northern Westchester Hospital (Northwell)", distance: "18 min", rating: "High Performing", note: "Excellent community hospital" },
    ],
    population: 7200,
    density: "Village — compact, walkable downtown, residential surrounding",
    demographics: { white: 76, hispanic: 12, asian: 7, black: 3, other: 2 },
    religion: "Catholic & Protestant anchor. More diverse and inclusive congregation culture than wealthier neighboring towns.",
    voting: { dem: 64, rep: 34 },
    editorial: "Pleasantville is the value play that smart buyers are starting to notice. It has a real, walkable downtown — not a manufactured one — with restaurants, a beloved independent cinema, and the kind of community energy that money can't buy. The schools are solid, the commute is reasonable, and the price point is roughly half of neighboring Chappaqua. It's the town for buyers who want substance over status, and who'd rather spend their equity on the life they're living than the address on the envelope.",
    history: "Home to Reader's Digest headquarters from 1939 to 2004 — the massive campus defined the town for decades. The name literally means what it says: early settlers found the area pleasant. The Jacob Burns Film Center, opened in 2001 in a restored 1925 movie theater, has become a major regional cultural institution.",
    notableResidents: ["DeWitt Wallace (Reader's Digest founder)", "Mira Sorvino (actress)", "Chevy Chase (comedian, grew up nearby)"],
    events: ["Pleasantville Music Festival", "Jacob Burns Film Center Screenings", "Pleasantville Farmers Market", "Ragamuffin Parade (Halloween)", "Village Holiday Festival"],
    highSchool: {
      name: "Pleasantville High School",
      mascot: "Panthers",
      colors: "Blue & White",
      sports: ["Football", "Soccer", "Basketball", "Lacrosse", "Track & Field"],
      arts: ["Growing theater program", "Music department", "Jacob Burns Film Center partnership"],
    },
    brokerages: [
      { firm: "Houlihan Lawrence", note: "Strongest presence in Pleasantville", agents: [
        { name: "Susan Kelty", phone: "9147692222", email: "skelty@houlihanlawrence.com", specialty: "Pleasantville village, first-time buyers" },
      ]},
      { firm: "Compass", note: "Active with younger buyers relocating from NYC", agents: [
        { name: "Dana Brockman", phone: "9149807832", email: "dana.brockman@compass.com", specialty: "Pleasantville & Mt. Pleasant, value-focused" },
      ]},
      { firm: "Coldwell Banker Realty", note: "Reliable coverage in the central corridor", agents: [
        { name: "Kathleen Collins", phone: "9147692700", email: "kathleen.collins@cbrealty.com", specialty: "Pleasantville & Thornwood, local veteran" },
      ]},
    ],
  },
  {
    name: "Pelham",
    tagline: "Hidden gem, strong schools, fast commute",
    metro: 28,
    medianPrice: 920000,
    taxRate: 2.7,
    schools: 9,
    walkability: 71,
    vibe: "Underrated village feel, strong schools, fastest commute to NYC",
    dining: 3,
    clubs: ["Pelham CC", "Wykagyl CC"],
    highlights: ["Fastest commute to NYC", "Undervalued market", "Strong school district", "Tight community"],
    color: "#C4A882",
    hospitals: [
      { name: "Montefiore Medical Center", distance: "12 min", rating: "★ Major Academic Center", note: "One of the best in NY metro" },
      { name: "NewYork-Presbyterian/Lawrence", distance: "10 min", rating: "High Performing", note: "Strong cardiac & ortho" },
      { name: "Westchester Medical Center", distance: "28 min", rating: "★ Level 1 Trauma", note: "Best for serious care" },
    ],
    population: 12500,
    density: "Small town — two villages (Pelham & Pelham Manor), walkable cores",
    demographics: { white: 74, hispanic: 10, asian: 8, black: 6, other: 2 },
    religion: "Catholic, Protestant & Jewish all well represented. Christ Church Episcopal is historic. Inclusive, community-minded congregations.",
    voting: { dem: 66, rep: 32 },
    editorial: "Pelham is the commuter's dream that hasn't been fully discovered. Twenty-eight minutes to Grand Central — the fastest in Westchester — with a village feel, strong schools, and a price point that still has room to grow. The town is split between Pelham and Pelham Manor, each with its own character, but both share a warmth and community pride that's immediately felt. The market is undervalued relative to its fundamentals, and buyers who do their homework end up here.",
    history: "Pelham was founded by Thomas Pell, who purchased 50,000 acres from the Siwanoy in 1654. The Battle of Pell's Point in 1776 was a key Revolutionary War engagement. Lou Gehrig, the Iron Horse of baseball, grew up in the area. Christ Church, built in 1843, is one of the oldest continuously operating churches in the region.",
    notableResidents: ["Lou Gehrig (baseball legend)", "Don Imus (radio host)", "Chester A. Arthur (21st President, lived nearby)"],
    events: ["Pelham Art Festival", "Gazebo Concert Series", "Pelham Civics Association Events", "Town Day Celebration", "Holiday Tree Lighting & Parade"],
    highSchool: {
      name: "Pelham Memorial High School",
      mascot: "Pelicans",
      colors: "Blue & Gold",
      sports: ["Football", "Lacrosse", "Soccer", "Basketball", "Baseball"],
      arts: ["Theater productions", "Concert band & chorus", "Visual arts program", "Literary magazine"],
    },
    brokerages: [
      { firm: "Julia B. Fee Sotheby's", note: "Strong in the Sound Shore corridor including Pelham", agents: [
        { name: "Patricia Harbison", phone: "9147157940", email: "patricia.harbison@juliabfee.com", specialty: "Pelham Manor, luxury specialist" },
      ]},
      { firm: "Houlihan Lawrence", note: "Reliable coverage across lower Westchester", agents: [
        { name: "Joyce Paster", phone: "9147382500", email: "jpaster@houlihanlawrence.com", specialty: "Pelham & New Rochelle, commuter town expert" },
      ]},
      { firm: "Compass", note: "Growing presence with NYC transplants", agents: [
        { name: "Jennifer Leahy", phone: "9148360005", email: "jennifer.leahy@compass.com", specialty: "Pelham, fast-commute communities" },
      ]},
    ],
  },
];

const ScoreBar = ({ value, max = 10, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px" }}>
      <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: color, borderRadius: "2px", transition: "width 0.6s ease" }} />
    </div>
    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", width: "24px", textAlign: "right" }}>{value}</span>
  </div>
);

const fmt = (n) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

export default function WestchesterPortal() {
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState("schools");
  const [townTrends, setTownTrends] = useState({});

  const sorted = [...towns].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (sort === "price") return a.medianPrice - b.medianPrice;
    if (sort === "commute") return a.metro - b.metro;
    if (sort === "schools") return b.schools - a.schools;
    if (sort === "walkability") return b.walkability - a.walkability;
    if (sort === "taxes") return a.taxRate - b.taxRate;
    return 0;
  });

  const town = selected ? towns.find(t => t.name === selected) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F1318",
      fontFamily: "'Georgia', serif",
      color: "#E8E0D5",
      padding: "0",
    }}>
      {/* Header */}
      <div className="wp-header" style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, #1a1f2e 0%, #0F1318 100%)",
      }}>
        <div style={{ maxWidth: "1320px", margin: "0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "24px" }}>
          <div>
            <div style={{ fontSize: "12px", letterSpacing: "5px", color: "#C9A96E", textTransform: "uppercase", marginBottom: "12px" }}>
              Private Search · Westchester County
            </div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "300", margin: 0, letterSpacing: "-1px", color: "#F5EFE8", lineHeight: "1.1" }}>
              The Home Search for<br />People with Taste
            </h1>
            <p className="wp-subtitle" style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.35)", fontSize: "17px", fontStyle: "italic", maxWidth: "420px", lineHeight: "1.6" }}>
              Fifteen curated towns. Editorial intelligence. Real listings.
            </p>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { key: "schools", label: "Schools" },
              { key: "commute", label: "Commute" },
              { key: "price", label: "Price" },
              { key: "walkability", label: "Walkability" },
              { key: "taxes", label: "Taxes" },
            ].map(s => (
              <button key={s.key} onClick={() => setSort(s.key)} style={{
                padding: "7px 16px",
                borderRadius: "20px",
                border: sort === s.key ? "1px solid #C9A96E" : "1px solid rgba(255,255,255,0.1)",
                background: sort === s.key ? "rgba(201,169,110,0.12)" : "transparent",
                color: sort === s.key ? "#C9A96E" : "rgba(255,255,255,0.4)",
                fontSize: "12px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.25s ease",
                fontFamily: "'Georgia', serif",
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="wp-main">
        {/* Town List */}
        <div className={`wp-grid${selected ? " sidebar" : ""}`}>
          {sorted.map((t) => (
            <div
              key={t.name}
              onClick={() => setSelected(selected === t.name ? null : t.name)}
              style={{
                background: selected === t.name
                  ? "rgba(201,169,110,0.06)"
                  : "rgba(255,255,255,0.02)",
                border: selected === t.name
                  ? "1px solid rgba(201,169,110,0.25)"
                  : "1px solid rgba(255,255,255,0.05)",
                borderRadius: "16px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                overflow: "hidden",
              }}
            >
              {/* Gradient Photo Header */}
              <div style={{
                height: selected ? "100px" : "160px",
                background: `linear-gradient(135deg, ${t.color}22 0%, ${t.color}44 40%, ${t.color}18 100%)`,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: selected ? "16px 20px" : "24px 28px",
              }}>
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: `radial-gradient(ellipse at 30% 20%, ${t.color}30 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(15,19,24,0.7) 0%, transparent 50%)`,
                }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  {t.pinned && (
                    <div style={{
                      fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase",
                      background: "rgba(201,169,110,0.25)", color: "#C9A96E",
                      padding: "3px 10px", borderRadius: "10px", border: "1px solid rgba(201,169,110,0.35)",
                      display: "inline-block", marginBottom: "10px", backdropFilter: "blur(8px)",
                    }}>Top Pick</div>
                  )}
                  <h3 style={{
                    fontSize: selected ? "20px" : "30px", fontWeight: "300", margin: 0,
                    color: "#F5EFE8", letterSpacing: "-0.3px", lineHeight: "1.2",
                  }}>{t.name}</h3>
                  <div style={{
                    fontSize: "14px", color: "rgba(255,255,255,0.5)", marginTop: "4px",
                    fontStyle: "italic", letterSpacing: "0.2px",
                  }}>{t.tagline}</div>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: selected ? "16px 20px" : "24px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: selected ? "12px" : "20px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                    <div style={{ fontSize: selected ? "20px" : "26px", color: "#C9A96E", fontWeight: "300", letterSpacing: "-0.3px" }}>
                      {fmt(t.medianPrice)}
                    </div>
                    {townTrends[t.name] != null && (
                      <span style={{
                        fontSize: "12px",
                        color: townTrends[t.name] >= 0 ? "#7A9E7E" : "#C46B5E",
                        letterSpacing: "0.3px",
                        whiteSpace: "nowrap",
                      }}>
                        {townTrends[t.name] >= 0 ? "+" : ""}{townTrends[t.name]}% avg
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", letterSpacing: "1px", textTransform: "uppercase" }}>median</div>
                </div>

                <div className="wp-card-stats" style={{
                  marginBottom: selected ? "12px" : "20px",
                }}>
                  {[
                    { label: "Commute", value: `${t.metro} min` },
                    { label: "Schools", value: `${t.schools}/10` },
                    { label: "Walk", value: `${t.walkability}` },
                    ...(!selected ? [{ label: "Tax", value: `${t.taxRate}%` }, { label: "Dining", value: `${t.dining}/5` }, { label: "Pop.", value: t.population?.toLocaleString() }] : []),
                  ].map(stat => (
                    <div key={stat.label} style={{
                      background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: selected ? "8px 10px" : "12px 14px",
                      borderBottom: `1px solid ${t.color}15`,
                    }}>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "4px" }}>{stat.label}</div>
                      <div style={{ fontSize: selected ? "15px" : "17px", color: "#E8E0D5", fontWeight: "300" }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {!selected && (
                  <div style={{
                    fontSize: "15px", color: "rgba(255,255,255,0.4)", lineHeight: "1.7",
                    fontStyle: "italic", borderTop: "1px solid rgba(255,255,255,0.05)",
                    paddingTop: "16px",
                  }}>
                    {t.vibe}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        {town && (
          <div className="wp-detail" style={{
            animation: "fadeIn 0.3s ease",
          }}>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }`}</style>

            {/* Back button — appears at top on mobile */}
            <button
              className="wp-back-btn"
              onClick={() => setSelected(null)}
              style={{
                display: "none",
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "20px",
                color: "rgba(255,255,255,0.4)",
                fontSize: "13px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "'Georgia', serif",
              }}
            >
              ← Back to all towns
            </button>

            {/* Town Header */}
            <div style={{ marginBottom: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: town.color }} />
                <h2 style={{ fontSize: "38px", fontWeight: "400", margin: 0, color: "#F5EFE8" }}>{town.name}</h2>
              </div>
              <p style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontStyle: "italic", fontSize: "17px" }}>{town.tagline}</p>
            </div>

            {/* Key Stats */}
            <div className="wp-stats-row" style={{ marginBottom: "28px" }}>
              {[
                { label: "Median Price", value: fmt(town.medianPrice), sub: "home price" },
                { label: "NYC Commute", value: `${town.metro} min`, sub: "to Grand Central" },
                { label: "Tax Rate", value: `${town.taxRate}%`, sub: "annual property tax" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(201,169,110,0.06)", border: "1px solid rgba(201,169,110,0.15)", borderRadius: "10px", padding: "16px" }}>
                  <div style={{ fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: "#C9A96E", marginBottom: "6px" }}>{s.label}</div>
                  <div style={{ fontSize: "28px", color: "#F5EFE8", fontWeight: "300" }}>{s.value}</div>
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Scores */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
              <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "16px" }}>Quality Scores</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>School System</span>
                  </div>
                  <ScoreBar value={town.schools} color="#7A9E7E" />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>Walkability</span>
                  </div>
                  <ScoreBar value={town.walkability / 10} color="#8B9EB7" />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>Dining Scene</span>
                  </div>
                  <ScoreBar value={town.dining} max={5} color="#C9A96E" />
                </div>
              </div>
            </div>

            {/* Our Take — Editorial Narrative */}
            {town.editorial && (
              <div style={{ marginBottom: "28px", borderLeft: `2px solid ${town.color}`, paddingLeft: "20px" }}>
                <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "#C9A96E", marginBottom: "14px" }}>Our Take</div>
                <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.6)", lineHeight: "1.85", margin: 0, fontStyle: "italic" }}>
                  {town.editorial}
                </p>
              </div>
            )}

            {/* Highlights */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "14px" }}>Why It Works</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {town.highlights.map(h => (
                  <div key={h} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: town.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "15px", color: "rgba(255,255,255,0.65)" }}>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* History & Notable Residents */}
            {town.history && (
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "14px" }}>History</div>
                <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.55)", lineHeight: "1.75", margin: "0 0 16px" }}>
                  {town.history}
                </p>
                {town.notableResidents && town.notableResidents.length > 0 && (
                  <>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>Notable Residents</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {town.notableResidents.map(r => (
                        <span key={r} style={{
                          fontSize: "14px", color: "#C9A96E", background: "rgba(201,169,110,0.1)",
                          border: "1px solid rgba(201,169,110,0.2)", borderRadius: "16px",
                          padding: "5px 14px",
                        }}>{r}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Community Events */}
            {town.events && town.events.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "14px" }}>Community Events</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {town.events.map(e => (
                    <div key={e} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "2px", background: town.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)" }}>{e}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* High School */}
            {town.highSchool && (
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "14px" }}>High School</div>
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "18px", color: "#F5EFE8", fontWeight: "400", marginBottom: "4px" }}>{town.highSchool.name}</div>
                  <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "rgba(255,255,255,0.45)" }}>
                    <span>Mascot: <span style={{ color: "#C9A96E" }}>{town.highSchool.mascot}</span></span>
                    <span>Colors: <span style={{ color: "#C9A96E" }}>{town.highSchool.colors}</span></span>
                  </div>
                </div>
                <div className="wp-hs-grid">
                  <div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "8px" }}>Sports</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {town.highSchool.sports.map(s => (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#7A9E7E", flexShrink: 0 }} />
                          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "8px" }}>Arts</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {town.highSchool.arts.map(a => (
                        <div key={a} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#9B8BB4", flexShrink: 0 }} />
                          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Listings */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "#C9A96E", marginBottom: "16px" }}>Listings</div>
              <ListingsPanel townName={town.name} accentColor={town.color} onSoldData={(soldData) => {
                const valid = soldData.filter(s => !s.isNewConstruction && s.appreciation != null);
                if (valid.length > 0) {
                  const avg = valid.reduce((sum, s) => sum + s.appreciation, 0) / valid.length;
                  setTownTrends(prev => ({ ...prev, [town.name]: Math.round(avg) }));
                }
              }} />
            </div>

            {/* Top Brokerages */}
            {town.brokerages && town.brokerages.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "#C9A96E", marginBottom: "16px" }}>Top Brokerages</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {town.brokerages.map(b => (
                    <div key={b.firm} style={{ borderLeft: `2px solid ${town.color}`, paddingLeft: "16px" }}>
                      <div style={{ fontSize: "17px", color: "#F5EFE8", fontWeight: "400", marginBottom: "4px" }}>{b.firm}</div>
                      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontStyle: "italic", marginBottom: "12px" }}>{b.note}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {b.agents.map(a => (
                          <div key={a.name} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px 14px" }}>
                            <div style={{ fontSize: "15px", color: "#E8E0D5", marginBottom: "3px" }}>{a.name}</div>
                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "8px" }}>{a.specialty}</div>
                            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                              {a.phone && (
                                <a href={`tel:${a.phone}`} style={{ fontSize: "13px", color: "#C9A96E", textDecoration: "none" }}>
                                  {`(${a.phone.slice(0,3)}) ${a.phone.slice(3,6)}-${a.phone.slice(6)}`}
                                </a>
                              )}
                              {a.email && (
                                <a href={`mailto:${a.email}`} style={{ fontSize: "13px", color: "#C9A96E", textDecoration: "none" }}>
                                  {a.email}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Demographics & Voting */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "16px" }}>Community Profile</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>Population</div>
                  <div style={{ fontSize: "22px", color: "#F5EFE8" }}>{town.population?.toLocaleString()}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>Size & Feel</div>
                  <div style={{ fontSize: "14px", color: "#E8E0D5", lineHeight: "1.4" }}>{town.density}</div>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "10px", letterSpacing: "1px", textTransform: "uppercase" }}>Racial Makeup (Census)</div>
                {town.demographics && Object.entries(town.demographics).map(([group, pct]) => (
                  <div key={group} style={{ marginBottom: "7px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>{group === "black" ? "Black / African American" : group === "white" ? "White" : group === "hispanic" ? "Hispanic / Latino" : group === "asian" ? "Asian" : "Other"}</span>
                      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>{pct}%</span>
                    </div>
                    <div style={{ height: "2px", background: "rgba(255,255,255,0.08)", borderRadius: "1px" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: town.color, borderRadius: "1px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Voting Pattern */}
              {town.voting && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "10px", letterSpacing: "1px", textTransform: "uppercase" }}>Voting Pattern</div>
                  <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", marginBottom: "8px" }}>
                    <div style={{ width: `${town.voting.dem}%`, background: "#5B8DB8", transition: "width 0.6s ease" }} />
                    <div style={{ width: `${town.voting.rep}%`, background: "#C46B5E", transition: "width 0.6s ease" }} />
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.1)" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#5B8DB8" }}>D {town.voting.dem}%</span>
                    <span style={{ color: "#C46B5E" }}>R {town.voting.rep}%</span>
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "1px", textTransform: "uppercase" }}>Religious Community</div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: "1.6", fontStyle: "italic" }}>{town.religion}</div>
              </div>
            </div>

            {/* Country Clubs */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "14px" }}>Country Clubs</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {town.clubs.map(c => (
                  <div key={c} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#C9A96E", flexShrink: 0 }} />
                    <span style={{ fontSize: "15px", color: "rgba(255,255,255,0.65)" }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hospitals */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "14px" }}>Nearby Hospitals</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {town.hospitals.map(h => (
                  <div key={h.name} style={{ borderLeft: `2px solid ${h.rating.includes("★") ? "#C9A96E" : "rgba(255,255,255,0.15)"}`, paddingLeft: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3px" }}>
                      <span style={{ fontSize: "15px", color: "#E8E0D5" }}>{h.name}</span>
                      <span style={{ fontSize: "12px", color: h.rating.includes("★") ? "#C9A96E" : "#7A9E7E", marginLeft: "12px", whiteSpace: "nowrap" }}>{h.distance}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: h.rating.includes("★") ? "#C9A96E" : "#7A9E7E", marginBottom: "2px" }}>{h.rating}</div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>{h.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="wp-back-bottom"
              onClick={() => setSelected(null)}
              style={{
                marginTop: "24px",
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "20px",
                color: "rgba(255,255,255,0.4)",
                fontSize: "13px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "'Georgia', serif",
              }}
            >
              ← Back to all towns
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
