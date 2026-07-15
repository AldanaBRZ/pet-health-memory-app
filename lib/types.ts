export type Species = "Dog" | "Cat" | "Rabbit" | "Bird" | "Reptile" | "Small mammal" | "Horse" | "Fish" | "Other";

export type PrivateFileAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  storage: "local" | "supabase";
  storagePath: string;
  uploadedAt: string;
};

export type VetContact = {
  id: string;
  clinic: string;
  clinician: string;
  role: string;
  phone: string;
  email: string;
  address: string;
  afterHours?: string;
};

export type PetProfile = {
  name: string;
  photo?: PrivateFileAttachment;
  species: Species;
  customSpecies?: string;
  breed: string;
  customBreed?: string;
  birthDate: string;
  sex: string;
  weightKg: number;
  microchip: string;
  insurance: string;
  allergies: string[];
  conditions: string[];
  careInstructions: string[];
  vets: VetContact[];
};

export type EventType =
  | "symptom"
  | "vet"
  | "medication"
  | "physio"
  | "behavior"
  | "diet"
  | "procedure"
  | "test";

export type HealthEvent = {
  id: string;
  type: EventType;
  date: string;
  title: string;
  detail: string;
  source: string;
  related?: string;
  severity?: number;
  bodyArea?: string;
  files?: string[];
  attachments?: PrivateFileAttachment[];
};

export type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  status: "Active" | "Paused" | "Ended";
  refillNotes: string;
  vetNote?: string;
};

export type SymptomLog = {
  id: string;
  name: string;
  severity: number;
  bodyArea: string;
  dateTime: string;
  notes: string;
  files: string[];
  attachments?: PrivateFileAttachment[];
};

export type ExpenseCategory =
  | "Vet"
  | "Meds"
  | "Physio"
  | "Food"
  | "Insurance"
  | "Emergency";

export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  vendor: string;
  amount: number;
  note: string;
};

export type WeightPoint = {
  date: string;
  kg: number;
};

export type Reminder = {
  id: string;
  title: string;
  type: "Medication" | "Appointment" | "Follow-up" | "Refill" | "Home care";
  dueDate: string;
  done: boolean;
  notes: string;
};

export type VetDocument = {
  id: string;
  title: string;
  date: string;
  type: "Lab" | "Invoice" | "Imaging" | "Discharge" | "Care plan" | "Other";
  source: string;
  fileName?: string;
  attachment?: PrivateFileAttachment;
  notes: string;
};

export type PreventionStatus = "Done" | "Due soon" | "Overdue" | "Not applicable";

export type PreventionCategory =
  | "Vaccines"
  | "Dental care"
  | "Parasite prevention"
  | "Bloodwork"
  | "Weight checks"
  | "Mobility checks"
  | "Nutrition review"
  | "Insurance/admin"
  | "Custom";

export type PreventionItem = {
  id: string;
  title: string;
  category: PreventionCategory;
  status: PreventionStatus;
  nextDueDate?: string;
  lastDoneDate?: string;
  notes: string;
};

export type RoutineCategory =
  | "Activity"
  | "Physio"
  | "Medication"
  | "Supplements"
  | "Grooming"
  | "Rest"
  | "Enrichment"
  | "Appetite/hydration"
  | "Custom";

export type RoutineCadence = "Daily" | "Weekly";

export type HabitRoutine = {
  id: string;
  title: string;
  category: RoutineCategory;
  cadence: RoutineCadence;
  targetPerWeek: number;
  completionDates: string[];
  notes: string;
};

export type RiskWatchItem = {
  id: string;
  watch: string;
  whyItMatters: string;
  lastObserved: string;
  severity: number;
  notes: string;
  relatedTo?: string;
};

export type QualityOfLifeNote = {
  id: string;
  date: string;
  mobility: number;
  appetite: number;
  mood: number;
  comfort: number;
  notes: string;
};

export type PetLongevityData = {
  prevention: PreventionItem[];
  routines: HabitRoutine[];
  watchlist: RiskWatchItem[];
  qualityOfLifeNotes: QualityOfLifeNote[];
};

export type PetOnboardingState = {
  medicationsReviewed: boolean;
  remindersReviewed: boolean;
  emergencySummaryReviewed: boolean;
};

export type PetSectionTimestamps = {
  profile: string;
  contacts: string;
  medications: string;
  documents: string;
};

export type PetMemoryData = {
  id: string;
  profile: PetProfile;
  events: HealthEvent[];
  medications: Medication[];
  symptoms: SymptomLog[];
  expenses: Expense[];
  weights: WeightPoint[];
  reminders: Reminder[];
  documents: VetDocument[];
  longevity: PetLongevityData;
  onboarding: PetOnboardingState;
  sectionUpdatedAt: PetSectionTimestamps;
  updatedAt: string;
};

export type AppMemoryData = {
  pets: PetMemoryData[];
  activePetId: string;
  updatedAt: string;
};

export type SummaryResponse = {
  mode: "local" | "ai";
  summary: string;
  questions: string[];
};
