import type { AppMemoryData, PetMemoryData } from "./types";

export const STORAGE_KEY = "pet-health-memory:v1";

export const seedData: PetMemoryData = {
  id: "pet-milo",
  profile: {
    name: "Milo",
    species: "Dog",
    breed: "Golden Retriever mix",
    birthDate: "2020-04-18",
    sex: "Neutered male",
    weightKg: 30.4,
    microchip: "985 141 004 223 781",
    insurance: "CoveredCare Plus, policy CP-48291",
    allergies: ["Chicken protein", "Adhesive bandages"],
    conditions: [
      "Mild bilateral hip dysplasia",
      "Early osteoarthritis in left hip",
      "Sensitive stomach during NSAID courses"
    ],
    careInstructions: [
      "Avoid slippery floors after exercise.",
      "Short warm-up walk before stairs or car jumps.",
      "Give meds with food unless vet says otherwise.",
      "Call vet if limping worsens, appetite drops, or vomiting occurs."
    ],
    vets: [
      {
        id: "vet-1",
        clinic: "Riverbend Veterinary Hospital",
        clinician: "Dr. Hana Lee",
        role: "Primary vet",
        phone: "(415) 555-0184",
        email: "care@riverbendvet.example",
        address: "1180 Oak Street, San Francisco, CA",
        afterHours: "Bay Area Emergency Vet, (415) 555-0119"
      },
      {
        id: "vet-2",
        clinic: "Paws in Motion Rehab",
        clinician: "Mara Chen, CCRP",
        role: "Physio / rehab",
        phone: "(415) 555-0176",
        email: "rehab@pawsinmotion.example",
        address: "42 Valencia Street, San Francisco, CA"
      }
    ]
  },
  events: [
    {
      id: "evt-1",
      type: "vet",
      date: "2026-07-08T10:30:00",
      title: "Recheck after limp flare",
      detail:
        "Left hind limp improved after rest. Vet advised continuing short walks and monitoring appetite while on anti-inflammatory course.",
      source: "Riverbend Veterinary Hospital",
      related: "Left hip"
    },
    {
      id: "evt-2",
      type: "physio",
      date: "2026-07-05T15:00:00",
      title: "Hydrotherapy session",
      detail:
        "Completed 18 minutes treadmill with two rest breaks. Rehab noted better extension after warm-up.",
      source: "Paws in Motion Rehab",
      related: "Hip strength"
    },
    {
      id: "evt-3",
      type: "symptom",
      date: "2026-07-03T20:15:00",
      title: "Stiff after evening walk",
      detail:
        "Milo hesitated before stairs and favored left hind leg for about 20 minutes. No yelp, appetite normal.",
      source: "Owner observation",
      severity: 3,
      bodyArea: "Left hind leg"
    },
    {
      id: "evt-4",
      type: "medication",
      date: "2026-06-29T08:00:00",
      title: "Started carprofen course",
      detail:
        "7-day course started for limp flare. Give with breakfast and dinner; stop and call vet if vomiting or black stool.",
      source: "Dr. Lee",
      related: "Inflammation"
    },
    {
      id: "evt-5",
      type: "test",
      date: "2026-06-22T11:00:00",
      title: "Blood chemistry before NSAID refill",
      detail:
        "Kidney and liver values within reference range. Vet cleared short NSAID use if stomach remains settled.",
      source: "Riverbend lab report",
      files: ["Bloodwork_Jun_2026.pdf"]
    },
    {
      id: "evt-6",
      type: "behavior",
      date: "2026-06-16T19:40:00",
      title: "Reluctant to play fetch",
      detail:
        "Stopped after two throws and lay down near back door. Seemed bright otherwise and wanted dinner.",
      source: "Owner observation",
      severity: 2
    },
    {
      id: "evt-7",
      type: "diet",
      date: "2026-05-28T07:30:00",
      title: "Switched to salmon-sensitive formula",
      detail:
        "Changed food to reduce itching and stomach upset. Avoid chicken treats during transition.",
      source: "Owner plan with vet approval"
    },
    {
      id: "evt-8",
      type: "procedure",
      date: "2026-04-14T09:45:00",
      title: "Hip radiographs",
      detail:
        "Mild bilateral hip dysplasia; early arthritic change on left. No surgery recommended at this time.",
      source: "Riverbend Veterinary Hospital",
      files: ["Hip_Xray_Apr_2026.jpg"]
    }
  ],
  medications: [
    {
      id: "med-1",
      name: "Carprofen",
      dosage: "75 mg",
      frequency: "Twice daily with food during flare",
      startDate: "2026-06-29",
      endDate: "2026-07-06",
      status: "Ended",
      refillNotes: "Recheck bloodwork before longer course.",
      vetNote: "Do not combine with other NSAIDs or steroids."
    },
    {
      id: "med-2",
      name: "Dasuquin Advanced",
      dosage: "1 chew",
      frequency: "Once daily with breakfast",
      startDate: "2026-03-02",
      status: "Active",
      refillNotes: "About 12 chews left as of July 10.",
      vetNote: "Joint supplement for hip support."
    },
    {
      id: "med-3",
      name: "Omeprazole",
      dosage: "20 mg",
      frequency: "Once daily only when prescribed with NSAID course",
      startDate: "2026-06-29",
      endDate: "2026-07-06",
      status: "Ended",
      refillNotes: "Ask vet before restarting.",
      vetNote: "Used because Milo had stomach upset with prior anti-inflammatory."
    }
  ],
  symptoms: [
    {
      id: "sym-1",
      name: "Left hind limp",
      severity: 3,
      bodyArea: "Left hip / hind leg",
      dateTime: "2026-07-03T20:15:00",
      notes: "After 35-minute walk. Better after rest and cool pack.",
      files: ["limp_video_july3.mov"]
    },
    {
      id: "sym-2",
      name: "Morning stiffness",
      severity: 2,
      bodyArea: "Hips",
      dateTime: "2026-06-30T07:20:00",
      notes: "First 10 minutes after waking. No vocalization.",
      files: []
    },
    {
      id: "sym-3",
      name: "Soft stool",
      severity: 1,
      bodyArea: "Digestive",
      dateTime: "2026-06-30T21:10:00",
      notes: "During carprofen course; resolved next morning.",
      files: []
    },
    {
      id: "sym-4",
      name: "Itching paws",
      severity: 2,
      bodyArea: "Front paws",
      dateTime: "2026-05-26T18:00:00",
      notes: "More licking after chicken treats. Food transition started two days later.",
      files: ["paw_photo_may26.jpg"]
    }
  ],
  expenses: [
    {
      id: "exp-1",
      date: "2026-07-08",
      category: "Vet",
      vendor: "Riverbend Veterinary Hospital",
      amount: 142,
      note: "Recheck exam"
    },
    {
      id: "exp-2",
      date: "2026-07-05",
      category: "Physio",
      vendor: "Paws in Motion Rehab",
      amount: 95,
      note: "Hydrotherapy"
    },
    {
      id: "exp-3",
      date: "2026-06-29",
      category: "Meds",
      vendor: "Riverbend Pharmacy",
      amount: 68,
      note: "Carprofen + omeprazole"
    },
    {
      id: "exp-4",
      date: "2026-06-22",
      category: "Vet",
      vendor: "Riverbend Veterinary Hospital",
      amount: 218,
      note: "Blood chemistry"
    },
    {
      id: "exp-5",
      date: "2026-06-02",
      category: "Insurance",
      vendor: "CoveredCare",
      amount: 63,
      note: "Monthly premium"
    },
    {
      id: "exp-6",
      date: "2026-05-28",
      category: "Food",
      vendor: "Local Pet Market",
      amount: 84,
      note: "Salmon-sensitive formula"
    },
    {
      id: "exp-7",
      date: "2026-04-14",
      category: "Vet",
      vendor: "Riverbend Veterinary Hospital",
      amount: 487,
      note: "Sedated hip radiographs"
    }
  ],
  weights: [
    { date: "2026-02-15", kg: 31.2 },
    { date: "2026-03-20", kg: 30.9 },
    { date: "2026-04-14", kg: 30.8 },
    { date: "2026-05-19", kg: 30.5 },
    { date: "2026-06-22", kg: 30.7 },
    { date: "2026-07-08", kg: 30.4 }
  ],
  reminders: [
    {
      id: "rem-1",
      title: "Give Dasuquin with breakfast",
      type: "Medication",
      dueDate: "2026-07-11T08:00:00",
      done: false,
      notes: "Daily joint supplement."
    },
    {
      id: "rem-2",
      title: "Book next hydrotherapy session",
      type: "Appointment",
      dueDate: "2026-07-14T09:00:00",
      done: false,
      notes: "Aim for weekly while limp is settling."
    },
    {
      id: "rem-3",
      title: "Send gait video to rehab therapist",
      type: "Follow-up",
      dueDate: "2026-07-12T18:00:00",
      done: false,
      notes: "Record walking from side and rear."
    },
    {
      id: "rem-4",
      title: "Order Dasuquin refill",
      type: "Refill",
      dueDate: "2026-07-16T12:00:00",
      done: false,
      notes: "Current supply low."
    }
  ],
  documents: [
    {
      id: "doc-1",
      title: "June blood chemistry",
      date: "2026-06-22",
      type: "Lab",
      source: "Riverbend Veterinary Hospital",
      fileName: "Bloodwork_Jun_2026.pdf",
      notes: "Cleared for short NSAID course."
    },
    {
      id: "doc-2",
      title: "Hip radiograph report",
      date: "2026-04-14",
      type: "Imaging",
      source: "Riverbend Veterinary Hospital",
      fileName: "Hip_Xray_Report_Apr_2026.pdf",
      notes: "Mild bilateral dysplasia, early left hip OA."
    },
    {
      id: "doc-3",
      title: "Home exercise plan",
      date: "2026-07-05",
      type: "Care plan",
      source: "Paws in Motion Rehab",
      fileName: "Milo_Home_Exercises.pdf",
      notes: "Sit-to-stand reps, controlled leash walks, avoid fetch bursts."
    }
  ],
  longevity: {
    prevention: [
      {
        id: "prev-1",
        title: "Core vaccines review",
        category: "Vaccines",
        status: "Done",
        lastDoneDate: "2026-02-15",
        nextDueDate: "2027-02-15",
        notes: "Annual wellness visit confirmed rabies and DHPP schedule is current."
      },
      {
        id: "prev-2",
        title: "Dental exam and cleaning estimate",
        category: "Dental care",
        status: "Due soon",
        lastDoneDate: "2025-08-12",
        nextDueDate: "2026-08-12",
        notes: "Vet noted mild tartar; ask whether cleaning should be planned before winter."
      },
      {
        id: "prev-3",
        title: "Monthly parasite prevention",
        category: "Parasite prevention",
        status: "Done",
        lastDoneDate: "2026-07-01",
        nextDueDate: "2026-08-01",
        notes: "Flea/tick and heartworm prevention given with breakfast."
      },
      {
        id: "prev-4",
        title: "Senior-style bloodwork cadence",
        category: "Bloodwork",
        status: "Done",
        lastDoneDate: "2026-06-22",
        nextDueDate: "2026-12-22",
        notes: "Not technically senior, but vet recommended 6-month labs because NSAIDs may be needed for flares."
      },
      {
        id: "prev-5",
        title: "Weight check",
        category: "Weight checks",
        status: "Done",
        lastDoneDate: "2026-07-08",
        nextDueDate: "2026-08-08",
        notes: "Goal is slow, stable weight to reduce hip load."
      },
      {
        id: "prev-6",
        title: "Mobility and gait review",
        category: "Mobility checks",
        status: "Due soon",
        lastDoneDate: "2026-07-05",
        nextDueDate: "2026-07-19",
        notes: "Bring short walking video to physio visit."
      },
      {
        id: "prev-7",
        title: "Nutrition review",
        category: "Nutrition review",
        status: "Done",
        lastDoneDate: "2026-05-28",
        nextDueDate: "2026-09-01",
        notes: "Switched to salmon-sensitive formula; avoid chicken treats."
      },
      {
        id: "prev-8",
        title: "Insurance and admin review",
        category: "Insurance/admin",
        status: "Overdue",
        lastDoneDate: "2025-12-15",
        nextDueDate: "2026-06-15",
        notes: "Upload physio invoices and confirm hip-related coverage before next claim."
      },
      {
        id: "prev-9",
        title: "Home flooring safety check",
        category: "Custom",
        status: "Due soon",
        nextDueDate: "2026-07-20",
        notes: "Add runners near hallway and kitchen so Milo has traction after walks."
      }
    ],
    routines: [
      {
        id: "routine-1",
        title: "Controlled walks",
        category: "Activity",
        cadence: "Daily",
        targetPerWeek: 7,
        completionDates: ["2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07", "2026-07-08", "2026-07-10"],
        notes: "Two shorter leash walks beat one long fetch-heavy outing."
      },
      {
        id: "routine-2",
        title: "Home physio exercises",
        category: "Physio",
        cadence: "Daily",
        targetPerWeek: 5,
        completionDates: ["2026-07-04", "2026-07-06", "2026-07-08"],
        notes: "Sit-to-stand reps and slow figure-eights only when comfortable."
      },
      {
        id: "routine-3",
        title: "Medication and supplement adherence",
        category: "Medication",
        cadence: "Daily",
        targetPerWeek: 7,
        completionDates: ["2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"],
        notes: "Dasuquin with breakfast; NSAIDs only when prescribed."
      },
      {
        id: "routine-4",
        title: "Grooming and paw check",
        category: "Grooming",
        cadence: "Weekly",
        targetPerWeek: 2,
        completionDates: ["2026-07-05", "2026-07-09"],
        notes: "Check front paws for licking or irritation."
      },
      {
        id: "routine-5",
        title: "Sleep and recovery note",
        category: "Rest",
        cadence: "Daily",
        targetPerWeek: 5,
        completionDates: ["2026-07-06", "2026-07-07", "2026-07-09"],
        notes: "Log whether he settles after evening walk and avoids pacing."
      },
      {
        id: "routine-6",
        title: "Enrichment without hard stops",
        category: "Enrichment",
        cadence: "Weekly",
        targetPerWeek: 4,
        completionDates: ["2026-07-04", "2026-07-06", "2026-07-08"],
        notes: "Snuffle mat, scent games, and gentle tug instead of repeated ball launches."
      },
      {
        id: "routine-7",
        title: "Appetite and hydration check",
        category: "Appetite/hydration",
        cadence: "Daily",
        targetPerWeek: 7,
        completionDates: ["2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"],
        notes: "Especially important during medication courses."
      }
    ],
    watchlist: [
      {
        id: "watch-1",
        watch: "Left hind limping or stair hesitation",
        whyItMatters: "Milo has known hip dysplasia and early left hip osteoarthritis.",
        lastObserved: "2026-07-03",
        severity: 3,
        relatedTo: "Hip mobility",
        notes: "Discuss whether rehab plan or exercise limits should change if this repeats."
      },
      {
        id: "watch-2",
        watch: "Weight gain",
        whyItMatters: "Extra weight can add load to sore joints.",
        lastObserved: "2026-07-08",
        severity: 1,
        relatedTo: "Mobility",
        notes: "Current trend is slightly down and stable; keep watching monthly."
      },
      {
        id: "watch-3",
        watch: "Appetite loss, vomiting, or black stool during NSAID use",
        whyItMatters: "Milo has had stomach sensitivity during anti-inflammatory courses.",
        lastObserved: "2026-06-30",
        severity: 2,
        relatedTo: "Medication side effects",
        notes: "Soft stool resolved; ask vet what threshold should trigger a call."
      },
      {
        id: "watch-4",
        watch: "Paw licking or skin irritation",
        whyItMatters: "Prior itching seemed worse with chicken treats.",
        lastObserved: "2026-05-26",
        severity: 2,
        relatedTo: "Allergy/sensitivity",
        notes: "Track if symptoms return after diet changes or new treats."
      },
      {
        id: "watch-5",
        watch: "Coughing or lower exercise tolerance",
        whyItMatters: "Any repeated respiratory or stamina change is useful context for the vet.",
        lastObserved: "Not observed",
        severity: 1,
        relatedTo: "General monitoring",
        notes: "No current concern; included as an age-aware item to monitor."
      }
    ],
    qualityOfLifeNotes: [
      {
        id: "qol-1",
        date: "2026-07-08",
        mobility: 4,
        appetite: 5,
        mood: 5,
        comfort: 4,
        notes: "Bright after recheck; slight stiffness after longer walk."
      },
      {
        id: "qol-2",
        date: "2026-07-03",
        mobility: 3,
        appetite: 5,
        mood: 4,
        comfort: 3,
        notes: "Evening stiffness and stair hesitation, then improved after rest."
      },
      {
        id: "qol-3",
        date: "2026-06-22",
        mobility: 4,
        appetite: 5,
        mood: 5,
        comfort: 4,
        notes: "Normal appetite and mood at bloodwork visit."
      }
    ]
  },
  onboarding: {
    medicationsReviewed: false,
    remindersReviewed: false,
    emergencySummaryReviewed: false
  },
  sectionUpdatedAt: {
    profile: "2026-07-10T10:00:00",
    contacts: "2026-07-10T10:00:00",
    medications: "2026-07-10T10:00:00"
  },
  updatedAt: "2026-07-10T10:00:00"
};

export const seedExoticPetData: PetMemoryData = {
  id: "pet-juno",
  profile: {
    name: "Juno",
    species: "Reptile",
    customSpecies: "Bearded dragon",
    breed: "Central bearded dragon",
    birthDate: "2021-09-12",
    sex: "Female",
    weightKg: 0.42,
    microchip: "Not microchipped",
    insurance: "No active policy",
    allergies: ["None known"],
    conditions: ["History of mild femoral pore irritation", "Seasonal appetite dips during brumation-like periods"],
    careInstructions: [
      "Bring enclosure temperature log to reptile vet visits.",
      "Track appetite, stool, weight, and shedding notes.",
      "Call exotic vet if appetite stops for more than vet-advised threshold or if breathing changes."
    ],
    vets: [
      {
        id: "vet-exotic-1",
        clinic: "Bay Exotics Veterinary Care",
        clinician: "Dr. Priya Nair",
        role: "Exotics vet",
        phone: "(415) 555-0142",
        email: "care@bayexotics.example",
        address: "220 Mission Street, San Francisco, CA",
        afterHours: "Bay Area Emergency Exotics, (415) 555-0138"
      }
    ]
  },
  events: [
    {
      id: "evt-juno-1",
      type: "vet",
      date: "2026-07-01T14:00:00",
      title: "Exotics wellness exam",
      detail: "Body condition appropriate. Vet asked owner to keep tracking weight, appetite, basking behavior, and shed quality.",
      source: "Bay Exotics Veterinary Care"
    },
    {
      id: "evt-juno-2",
      type: "behavior",
      date: "2026-06-26T09:30:00",
      title: "Lower morning appetite",
      detail: "Ate greens later in the day, skipped morning insects. Basking and alertness normal.",
      source: "Owner observation",
      severity: 2
    },
    {
      id: "evt-juno-3",
      type: "diet",
      date: "2026-06-18T08:00:00",
      title: "Adjusted greens rotation",
      detail: "Added collards and squash; reduced high-water greens after loose stool note.",
      source: "Owner plan discussed with exotics vet"
    }
  ],
  medications: [
    {
      id: "med-juno-1",
      name: "Calcium powder",
      dosage: "Light dusting",
      frequency: "Per vet feeding plan",
      startDate: "2026-01-15",
      status: "Active",
      refillNotes: "Check supply monthly.",
      vetNote: "Supplement schedule should follow exotics vet guidance."
    }
  ],
  symptoms: [
    {
      id: "sym-juno-1",
      name: "Lower appetite",
      severity: 2,
      bodyArea: "General",
      dateTime: "2026-06-26T09:30:00",
      notes: "Skipped morning insects but ate greens later. No lethargy observed.",
      files: []
    }
  ],
  expenses: [
    {
      id: "exp-juno-1",
      date: "2026-07-01",
      category: "Vet",
      vendor: "Bay Exotics Veterinary Care",
      amount: 165,
      note: "Wellness exam"
    },
    {
      id: "exp-juno-2",
      date: "2026-06-18",
      category: "Food",
      vendor: "Local Reptile Supply",
      amount: 42,
      note: "Greens and feeder insects"
    }
  ],
  weights: [
    { date: "2026-04-01", kg: 0.4 },
    { date: "2026-05-01", kg: 0.41 },
    { date: "2026-06-01", kg: 0.42 },
    { date: "2026-07-01", kg: 0.42 }
  ],
  reminders: [
    {
      id: "rem-juno-1",
      title: "Record weekly weight",
      type: "Home care",
      dueDate: "2026-07-13T09:00:00",
      done: false,
      notes: "Use kitchen scale and note appetite context."
    }
  ],
  documents: [
    {
      id: "doc-juno-1",
      title: "Exotics wellness notes",
      date: "2026-07-01",
      type: "Care plan",
      source: "Bay Exotics Veterinary Care",
      fileName: "Juno_Wellness_Jul_2026.pdf",
      notes: "Placeholder for wellness exam instructions and husbandry checklist."
    }
  ],
  longevity: {
    prevention: [
      {
        id: "prev-juno-1",
        title: "Annual exotics wellness exam",
        category: "Custom",
        status: "Done",
        nextDueDate: "2027-07-01",
        lastDoneDate: "2026-07-01",
        notes: "Ask about weight, appetite, stool, shed, and enclosure setup."
      },
      {
        id: "prev-juno-2",
        title: "Habitat temperature and UVB review",
        category: "Custom",
        status: "Due soon",
        nextDueDate: "2026-08-01",
        notes: "Bring recent basking/cool-side readings to next conversation."
      }
    ],
    routines: [
      {
        id: "routine-juno-1",
        title: "Appetite and basking check",
        category: "Appetite/hydration",
        cadence: "Daily",
        targetPerWeek: 7,
        completionDates: ["2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07", "2026-07-08"],
        notes: "Track appetite, basking time, stool, and alertness."
      }
    ],
    watchlist: [
      {
        id: "watch-juno-1",
        watch: "Appetite drop or lethargy",
        whyItMatters: "Changes in appetite and activity are useful context for an exotics vet.",
        lastObserved: "2026-06-26",
        severity: 2,
        notes: "Phrase as observation and ask vet what threshold should trigger a visit."
      },
      {
        id: "watch-juno-2",
        watch: "Difficult shed or skin irritation",
        whyItMatters: "Shedding notes can help the vet review hydration, humidity, and husbandry context.",
        lastObserved: "Not observed",
        severity: 1,
        notes: "Monitor and discuss if repeated or severe."
      }
    ],
    qualityOfLifeNotes: [
      {
        id: "qol-juno-1",
        date: "2026-07-01",
        mobility: 5,
        appetite: 4,
        mood: 5,
        comfort: 5,
        notes: "Bright, active, and steady weight at wellness exam."
      }
    ]
  },
  onboarding: {
    medicationsReviewed: false,
    remindersReviewed: false,
    emergencySummaryReviewed: false
  },
  sectionUpdatedAt: {
    profile: "2026-07-10T10:00:00",
    contacts: "2026-07-10T10:00:00",
    medications: "2026-07-10T10:00:00"
  },
  updatedAt: "2026-07-10T10:00:00"
};

export const seedAppData: AppMemoryData = {
  pets: [seedData, seedExoticPetData],
  activePetId: seedData.id,
  updatedAt: "2026-07-10T10:00:00"
};
