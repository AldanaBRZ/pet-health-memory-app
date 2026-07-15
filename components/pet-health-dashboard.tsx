"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Bell,
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  ClipboardList,
  Cloud,
  CloudOff,
  Download,
  FilePlus2,
  FileText,
  HeartPulse,
  Home,
  ListChecks,
  LineChart,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  NotebookTabs,
  PawPrint,
  Pencil,
  Pill,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Trash2,
  UserPlus,
  Upload,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { seedAppData, seedData, seedExoticPetData, STORAGE_KEY } from "../lib/seed-data";
import { isEmailAllowedForTesting, isSupabaseConfigured, supabase } from "../lib/supabase-client";
import type {
  AppMemoryData,
  EventType,
  Expense,
  ExpenseCategory,
  HabitRoutine,
  HealthEvent,
  Medication,
  PetLongevityData,
  PetMemoryData,
  PetOnboardingState,
  PetProfile,
  PetSectionTimestamps,
  PreventionCategory,
  PreventionItem,
  PreventionStatus,
  Reminder,
  RiskWatchItem,
  RoutineCadence,
  RoutineCategory,
  SummaryResponse,
  SymptomLog,
  VetContact,
  VetDocument,
  WeightPoint
} from "../lib/types";

type ViewId =
  | "overview"
  | "care"
  | "more"
  | "profile"
  | "timeline"
  | "meds"
  | "symptoms"
  | "expenses"
  | "trends"
  | "longevity"
  | "recent"
  | "emergency";

type ViewMeta = { label: string; icon: LucideIcon };
type TimeRange = 7 | 30 | 90;
type SyncStatus = "local" | "checking" | "signed-out" | "loading-cloud" | "saving" | "synced" | "conflict" | "error";
type WeightUnit = "kg" | "lb";
type ProfileErrorField = "name" | "species" | "breed" | "customBreed" | "birthDate" | "sex" | "weightKg";
type PetSection = keyof PetSectionTimestamps;
type CommitPetMemory = (
  updater: (current: PetMemoryData) => PetMemoryData,
  sections?: PetSection | PetSection[],
  petId?: string
) => void;
type RegisterUndo = (message: string, restore: () => void) => void;
type UndoAction = { id: string; message: string; restore: () => void };
type AppNotice = { id: string; message: string; tone: "info" | "error" };

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const emptyOnboarding: PetOnboardingState = {
  medicationsReviewed: false,
  remindersReviewed: false,
  emergencySummaryReviewed: false
};

const viewMeta: Record<ViewId, ViewMeta> = {
  overview: { label: "Today", icon: Home },
  care: { label: "Care Plan", icon: ClipboardList },
  more: { label: "More", icon: ListChecks },
  profile: { label: "Profile", icon: PawPrint },
  timeline: { label: "Timeline", icon: NotebookTabs },
  meds: { label: "Meds", icon: Pill },
  symptoms: { label: "Symptoms", icon: HeartPulse },
  expenses: { label: "Costs", icon: BadgeDollarSign },
  trends: { label: "Trends", icon: LineChart },
  longevity: { label: "Longevity", icon: ShieldCheck },
  recent: { label: "Recent", icon: Sparkles },
  emergency: { label: "Emergency", icon: AlertTriangle }
};

const navItems: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Today", icon: Home },
  { id: "timeline", label: "Timeline", icon: NotebookTabs },
  { id: "care", label: "Care Plan", icon: ClipboardList },
  { id: "trends", label: "Trends", icon: LineChart },
  { id: "emergency", label: "Emergency", icon: AlertTriangle },
  { id: "more", label: "More", icon: ListChecks }
];

const primaryNavIds = navItems.map((item) => item.id);

const moreToolItems: Array<{ view: ViewId; title: string; description: string; icon: LucideIcon }> = [
  { view: "profile", title: "Profile", description: "Identity, conditions, allergies, care instructions, and vet contacts.", icon: PawPrint },
  { view: "meds", title: "Medication tracker", description: "Dosage, frequency, refill notes, and active or ended meds.", icon: Pill },
  { view: "symptoms", title: "Symptom log", description: "Severity, body area, notes, and photo/file placeholders.", icon: HeartPulse },
  { view: "expenses", title: "Costs", description: "Vet, meds, physio, food, insurance, and emergency spend.", icon: BadgeDollarSign },
  { view: "longevity", title: "Longevity", description: "Prevention, habits, watchlist, quality notes, and prep questions.", icon: ShieldCheck },
  { view: "recent", title: "What changed", description: "7, 30, and 90 day summaries for care conversations.", icon: Sparkles }
];

const moreToolIds = moreToolItems.map((item) => item.view);

const eventLabels: Record<EventType, string> = {
  symptom: "Symptom",
  vet: "Vet visit",
  medication: "Medication",
  physio: "Physio",
  behavior: "Behavior",
  diet: "Diet",
  procedure: "Procedure",
  test: "Test result"
};

const eventTone: Record<EventType, string> = {
  symptom: "border-coral/30 bg-coral/10 text-coral",
  vet: "border-clinical/30 bg-skywash/70 text-clinical",
  medication: "border-lilac/30 bg-lilac/10 text-lilac",
  physio: "border-sage/40 bg-sage/20 text-pine",
  behavior: "border-amber/30 bg-amber/10 text-amber",
  diet: "border-skywash bg-skywash/70 text-ink",
  procedure: "border-ink/10 bg-white text-ink",
  test: "border-clinical/20 bg-white text-clinical"
};

const eventAccent: Record<EventType, string> = {
  symptom: "border-l-coral",
  vet: "border-l-clinical",
  medication: "border-l-lilac",
  physio: "border-l-sage",
  behavior: "border-l-amber",
  diet: "border-l-skywash",
  procedure: "border-l-ink/30",
  test: "border-l-clinical"
};

const categories: ExpenseCategory[] = [
  "Vet",
  "Meds",
  "Physio",
  "Food",
  "Insurance",
  "Emergency"
];

const speciesOptions: PetProfile["species"][] = ["Dog", "Cat", "Rabbit", "Bird", "Reptile", "Small mammal", "Horse", "Fish", "Other"];

const dogBreedOptions = [
  "Mixed Breed",
  "Other",
  "Golden Retriever mix",
  "Hound mix",
  "Labrador Retriever mix",
  "Poodle mix",
  "Retriever mix",
  "Shepherd mix",
  "Terrier mix",
  "Affenpinscher",
  "Afghan Hound",
  "Airedale Terrier",
  "Akbash",
  "Akita",
  "Alaskan Klee Kai",
  "Alaskan Malamute",
  "American Bulldog",
  "American Bully",
  "American English Coonhound",
  "American Eskimo Dog",
  "American Foxhound",
  "American Hairless Terrier",
  "American Leopard Hound",
  "American Staffordshire Terrier",
  "American Water Spaniel",
  "Anatolian Shepherd Dog",
  "Appenzeller Sennenhund",
  "Australian Cattle Dog",
  "Australian Shepherd",
  "Australian Terrier",
  "Azawakh",
  "Basenji",
  "Basset Hound",
  "Beagle",
  "Bearded Collie",
  "Beauceron",
  "Bedlington Terrier",
  "Belgian Malinois",
  "Belgian Sheepdog",
  "Belgian Tervuren",
  "Bernese Mountain Dog",
  "Bichon Frise",
  "Biewer Terrier",
  "Black and Tan Coonhound",
  "Bloodhound",
  "Boerboel",
  "Border Collie",
  "Border Terrier",
  "Borzoi",
  "Boston Terrier",
  "Bouvier des Flandres",
  "Boxer",
  "Boykin Spaniel",
  "Braque du Bourbonnais",
  "Braque Francais Pyrenean",
  "Briard",
  "Brittany",
  "Broholmer",
  "Brussels Griffon",
  "Bull Terrier",
  "Bulldog",
  "Bullmastiff",
  "Cairn Terrier",
  "Canaan Dog",
  "Cane Corso",
  "Carolina Dog",
  "Cardigan Welsh Corgi",
  "Catahoula Leopard Dog",
  "Caucasian Shepherd Dog",
  "Cavalier King Charles Spaniel",
  "Cavapoo",
  "Central Asian Shepherd Dog",
  "Cesky Terrier",
  "Chesapeake Bay Retriever",
  "Chihuahua",
  "Chinese Crested",
  "Chinese Shar-Pei",
  "Chinook",
  "Chow Chow",
  "Cirneco dell'Etna",
  "Clumber Spaniel",
  "Cockapoo",
  "Cocker Spaniel",
  "Collie",
  "Coton de Tulear",
  "Danish-Swedish Farmdog",
  "Dachshund",
  "Dalmatian",
  "Doberman Pinscher",
  "Dogo Argentino",
  "Dogue de Bordeaux",
  "Dutch Shepherd",
  "English Cocker Spaniel",
  "English Foxhound",
  "English Setter",
  "English Springer Spaniel",
  "English Toy Spaniel",
  "Entlebucher Mountain Dog",
  "Eurasier",
  "Field Spaniel",
  "Finnish Lapphund",
  "Finnish Spitz",
  "Flat-Coated Retriever",
  "French Bulldog",
  "French Spaniel",
  "German Longhaired Pointer",
  "German Pinscher",
  "German Shepherd Dog",
  "German Shorthaired Pointer",
  "German Spitz",
  "German Wirehaired Pointer",
  "Giant Schnauzer",
  "Goldendoodle",
  "Golden Retriever",
  "Gordon Setter",
  "Grand Basset Griffon Vendeen",
  "Great Dane",
  "Great Pyrenees",
  "Greater Swiss Mountain Dog",
  "Greyhound",
  "Hamiltonstovare",
  "Hanoverian Scenthound",
  "Havanese",
  "Hokkaido",
  "Ibizan Hound",
  "Icelandic Sheepdog",
  "Irish Setter",
  "Irish Terrier",
  "Irish Water Spaniel",
  "Irish Wolfhound",
  "Italian Greyhound",
  "Jack Russell Terrier",
  "Japanese Chin",
  "Jindo",
  "Kai Ken",
  "Karelian Bear Dog",
  "Keeshond",
  "Kerry Blue Terrier",
  "Kishu Ken",
  "Komondor",
  "Kuvasz",
  "Labradoodle",
  "Labrador Retriever",
  "Lagotto Romagnolo",
  "Lakeland Terrier",
  "Lancashire Heeler",
  "Leonberger",
  "Lhasa Apso",
  "Lowchen",
  "Maltese",
  "Manchester Terrier",
  "Mastiff",
  "Miniature American Shepherd",
  "Miniature Pinscher",
  "Miniature Schnauzer",
  "Mudi",
  "Nederlandse Kooikerhondje",
  "Neapolitan Mastiff",
  "Newfoundland",
  "Norrbottenspets",
  "Norfolk Terrier",
  "Norwegian Buhund",
  "Norwegian Elkhound",
  "Norwegian Lundehund",
  "Norwich Terrier",
  "Nova Scotia Duck Tolling Retriever",
  "Old English Sheepdog",
  "Otterhound",
  "Papillon",
  "Parson Russell Terrier",
  "Pekingese",
  "Pembroke Welsh Corgi",
  "Peruvian Inca Orchid",
  "Petit Basset Griffon Vendeen",
  "Pharaoh Hound",
  "Plott Hound",
  "Polish Lowland Sheepdog",
  "Pointer",
  "Pomeranian",
  "Pomsky",
  "Poodle",
  "Portuguese Podengo",
  "Portuguese Podengo Pequeno",
  "Portuguese Water Dog",
  "Presa Canario",
  "Pug",
  "Puli",
  "Pumi",
  "Pyrenean Mastiff",
  "Pyrenean Shepherd",
  "Rat Terrier",
  "Redbone Coonhound",
  "Rhodesian Ridgeback",
  "Rottweiler",
  "Russell Terrier",
  "Saint Bernard",
  "Saluki",
  "Samoyed",
  "Schipperke",
  "Schapendoes",
  "Scottish Deerhound",
  "Scottish Terrier",
  "Sealyham Terrier",
  "Shetland Sheepdog",
  "Shiba Inu",
  "Shikoku",
  "Shih Tzu",
  "Siberian Husky",
  "Silky Terrier",
  "Skye Terrier",
  "Smooth Fox Terrier",
  "Soft Coated Wheaten Terrier",
  "Spanish Mastiff",
  "Spanish Water Dog",
  "Spinone Italiano",
  "Staffordshire Bull Terrier",
  "Standard Schnauzer",
  "Sussex Spaniel",
  "Swedish Vallhund",
  "Thai Ridgeback",
  "Tibetan Mastiff",
  "Tibetan Spaniel",
  "Tibetan Terrier",
  "Tosa",
  "Toy Fox Terrier",
  "Transylvanian Hound",
  "Treeing Walker Coonhound",
  "Vizsla",
  "Weimaraner",
  "Welsh Springer Spaniel",
  "Welsh Terrier",
  "West Highland White Terrier",
  "Whippet",
  "Wire Fox Terrier",
  "Wirehaired Pointing Griffon",
  "Wirehaired Vizsla",
  "Working Kelpie",
  "Xoloitzcuintli",
  "Yakutian Laika",
  "Yorkshire Terrier"
];

const KG_PER_LB = 0.45359237;

const categoryTone: Record<ExpenseCategory, string> = {
  Vet: "bg-clinical",
  Meds: "bg-lilac",
  Physio: "bg-sage",
  Food: "bg-amber",
  Insurance: "bg-skywash",
  Emergency: "bg-coral"
};

const preventionStatuses: PreventionStatus[] = ["Done", "Due soon", "Overdue", "Not applicable"];

const preventionCategories: PreventionCategory[] = [
  "Vaccines",
  "Dental care",
  "Parasite prevention",
  "Bloodwork",
  "Weight checks",
  "Mobility checks",
  "Nutrition review",
  "Insurance/admin",
  "Custom"
];

const routineCategories: RoutineCategory[] = [
  "Activity",
  "Physio",
  "Medication",
  "Supplements",
  "Grooming",
  "Rest",
  "Enrichment",
  "Appetite/hydration",
  "Custom"
];

const toLocalInput = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const todayInput = () => toLocalInput().slice(0, 10);

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const emptyEvent = (): HealthEvent => ({
  id: "",
  type: "symptom",
  date: toLocalInput(),
  title: "",
  detail: "",
  source: "Owner observation",
  severity: 2,
  bodyArea: "",
  files: []
});

const emptyMedication = (): Medication => ({
  id: "",
  name: "",
  dosage: "",
  frequency: "",
  startDate: todayInput(),
  status: "Active",
  refillNotes: "",
  vetNote: ""
});

const emptySymptom = (): SymptomLog => ({
  id: "",
  name: "",
  severity: 2,
  bodyArea: "",
  dateTime: toLocalInput(),
  notes: "",
  files: []
});

const emptyExpense = (): Expense => ({
  id: "",
  date: todayInput(),
  category: "Vet",
  vendor: "",
  amount: 0,
  note: ""
});

const cloneProfile = (profile: PetProfile): PetProfile => ({
  ...profile,
  allergies: [...profile.allergies],
  conditions: [...profile.conditions],
  careInstructions: [...profile.careInstructions],
  vets: profile.vets.map((vet) => ({ ...vet }))
});

const validateProfile = (profile: PetProfile): Partial<Record<ProfileErrorField, string>> => {
  const errors: Partial<Record<ProfileErrorField, string>> = {};

  if (!profile.name.trim()) errors.name = "Name is required.";
  if (!profile.species) errors.species = "Species is required.";
  if (!profile.breed.trim()) {
    errors.breed = "Breed or type is required.";
  } else if (profile.species === "Dog") {
    if (!dogBreedOptions.includes(profile.breed.trim())) {
      errors.breed = "Choose a breed from the list.";
    } else if (profile.breed.trim() === "Other" && !profile.customBreed?.trim()) {
      errors.customBreed = "Specify the breed or type.";
    }
  }
  if (!profile.birthDate) {
    errors.birthDate = "Birth date is required.";
  } else if (Number.isNaN(new Date(profile.birthDate).getTime())) {
    errors.birthDate = "Use a valid birth date.";
  }
  if (!profile.sex.trim()) errors.sex = "Sex is required.";
  if (!Number.isFinite(profile.weightKg) || profile.weightKg <= 0) errors.weightKg = "Weight is required.";

  return errors;
};

const hasProfileErrors = (errors: Partial<Record<ProfileErrorField, string>>) => Object.keys(errors).length > 0;

const cleanProfile = (profile: PetProfile): PetProfile => ({
  ...profile,
  name: profile.name.trim(),
  customSpecies: profile.customSpecies?.trim(),
  breed: profile.breed.trim(),
  customBreed: profile.customBreed?.trim(),
  sex: profile.sex.trim(),
  microchip: profile.microchip.trim(),
  insurance: profile.insurance.trim()
});

const kgToLb = (kg: number) => kg / KG_PER_LB;
const lbToKg = (lb: number) => lb * KG_PER_LB;

const formatWeightInput = (kg: number, unit: WeightUnit) => {
  if (!Number.isFinite(kg) || kg <= 0) return "";
  const value = unit === "kg" ? kg : kgToLb(kg);
  return Number(value.toFixed(1)).toString();
};

const formatWeightKg = (kg: number) => (Number.isFinite(kg) && kg > 0 ? `${kg.toFixed(1)} kg` : "Weight not set");

const emptyReminder = (): Reminder => ({
  id: "",
  title: "",
  type: "Follow-up",
  dueDate: toLocalInput(),
  done: false,
  notes: ""
});

const emptyWeight = (kg = seedData.profile.weightKg): WeightPoint => ({
  date: todayInput(),
  kg
});

const emptyPrevention = (): PreventionItem => ({
  id: "",
  title: "",
  category: "Custom",
  status: "Due soon",
  nextDueDate: todayInput(),
  notes: ""
});

const emptyRoutine = (): HabitRoutine => ({
  id: "",
  title: "",
  category: "Custom",
  cadence: "Weekly",
  targetPerWeek: 3,
  completionDates: [],
  notes: ""
});

function normalizePetMemoryData(value: Partial<PetMemoryData>, fallback: PetMemoryData = seedData): PetMemoryData {
  const updatedAt = value.updatedAt ?? fallback.updatedAt;
  return {
    ...fallback,
    ...value,
    id: value.id ?? fallback.id ?? newId("pet"),
    profile: {
      ...fallback.profile,
      ...value.profile,
      allergies: value.profile?.allergies ?? fallback.profile.allergies,
      conditions: value.profile?.conditions ?? fallback.profile.conditions,
      careInstructions: value.profile?.careInstructions ?? fallback.profile.careInstructions,
      vets: value.profile?.vets ?? fallback.profile.vets
    },
    events: value.events ?? fallback.events,
    medications: value.medications ?? fallback.medications,
    symptoms: value.symptoms ?? fallback.symptoms,
    expenses: value.expenses ?? fallback.expenses,
    weights: value.weights ?? fallback.weights,
    reminders: value.reminders ?? fallback.reminders,
    documents: value.documents ?? fallback.documents,
    longevity: {
      ...fallback.longevity,
      ...(value.longevity as Partial<PetLongevityData> | undefined),
      prevention: value.longevity?.prevention ?? fallback.longevity.prevention,
      routines: value.longevity?.routines ?? fallback.longevity.routines,
      watchlist: value.longevity?.watchlist ?? fallback.longevity.watchlist,
      qualityOfLifeNotes: value.longevity?.qualityOfLifeNotes ?? fallback.longevity.qualityOfLifeNotes
    },
    onboarding: {
      ...emptyOnboarding,
      ...value.onboarding
    },
    sectionUpdatedAt: {
      profile: value.sectionUpdatedAt?.profile ?? updatedAt,
      contacts: value.sectionUpdatedAt?.contacts ?? updatedAt,
      medications: value.sectionUpdatedAt?.medications ?? updatedAt
    },
    updatedAt
  };
}

function normalizeAppMemoryData(value: unknown, includeDemoCompanion = true): AppMemoryData {
  if (isRecord(value) && Array.isArray(value.pets)) {
    const normalizedPets = value.pets.length
      ? value.pets.map((pet, index) => normalizePetMemoryData((isRecord(pet) ? pet : {}) as Partial<PetMemoryData>, seedAppData.pets[index] ?? seedData))
      : seedAppData.pets;
    const pets = includeDemoCompanion ? withDemoExoticPet(normalizedPets) : normalizedPets;
    const requestedActivePetId = typeof value.activePetId === "string" ? value.activePetId : "";
    const activePetId = pets.some((pet) => pet.id === requestedActivePetId) ? requestedActivePetId : pets[0]?.id ?? seedData.id;
    return {
      pets,
      activePetId,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : newestPetTimestamp(pets)
    };
  }

  const pet = normalizePetMemoryData((isRecord(value) ? value : {}) as Partial<PetMemoryData>);
  const pets = includeDemoCompanion ? withDemoExoticPet([pet]) : [pet];
  return {
    pets,
    activePetId: pet.id,
    updatedAt: newestPetTimestamp(pets)
  };
}

function withDemoExoticPet(pets: PetMemoryData[]) {
  if (pets.some((pet) => pet.id === seedExoticPetData.id)) return pets;
  if (!pets.some(isDemoMiloPet)) return pets;
  return [...pets, seedExoticPetData];
}

function isDemoMiloPet(pet: PetMemoryData) {
  return (
    pet.id === seedData.id ||
    (pet.profile.name === seedData.profile.name &&
      pet.profile.breed === seedData.profile.breed &&
      pet.profile.vets.some((vet) => vet.clinic === "Riverbend Veterinary Hospital"))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasStringFields(value: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => typeof value[field] === "string");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecordArray(value: unknown, validator: (item: Record<string, unknown>) => boolean) {
  return Array.isArray(value) && value.every((item) => isRecord(item) && validator(item));
}

function validateImportedPet(value: unknown, index: number) {
  if (!isRecord(value)) return `Pet ${index + 1} is not a valid record.`;
  if (typeof value.id !== "string" || !value.id.trim()) return `Pet ${index + 1} is missing an ID.`;
  if (!isRecord(value.profile)) return `Pet ${index + 1} is missing its profile.`;

  const profile = value.profile;
  if (!hasStringFields(profile, ["name", "species", "breed", "birthDate", "sex", "microchip", "insurance"])) {
    return `Pet ${index + 1} has invalid profile fields.`;
  }
  if (typeof profile.weightKg !== "number" || !Number.isFinite(profile.weightKg)) {
    return `Pet ${index + 1} has an invalid weight.`;
  }
  if (!isStringArray(profile.allergies) || !isStringArray(profile.conditions) || !isStringArray(profile.careInstructions)) {
    return `Pet ${index + 1} has invalid medical notes.`;
  }
  if (
    !isRecordArray(profile.vets, (vet) =>
      hasStringFields(vet, ["id", "clinic", "clinician", "role", "phone", "email", "address"])
    )
  ) {
    return `Pet ${index + 1} has invalid vet contacts.`;
  }

  const collectionChecks: Array<[string, (item: Record<string, unknown>) => boolean]> = [
    ["events", (item) => hasStringFields(item, ["id", "type", "date", "title", "detail", "source"])],
    ["medications", (item) => hasStringFields(item, ["id", "name", "dosage", "frequency", "startDate", "status", "refillNotes"])],
    [
      "symptoms",
      (item) =>
        hasStringFields(item, ["id", "name", "bodyArea", "dateTime", "notes"]) &&
        typeof item.severity === "number" &&
        isStringArray(item.files)
    ],
    [
      "expenses",
      (item) => hasStringFields(item, ["id", "date", "category", "vendor", "note"]) && typeof item.amount === "number"
    ],
    ["weights", (item) => typeof item.date === "string" && typeof item.kg === "number"],
    [
      "reminders",
      (item) => hasStringFields(item, ["id", "title", "type", "dueDate", "notes"]) && typeof item.done === "boolean"
    ],
    ["documents", (item) => hasStringFields(item, ["id", "title", "date", "type", "source", "notes"])]
  ];

  for (const [field, validator] of collectionChecks) {
    if (!isRecordArray(value[field], validator)) return `Pet ${index + 1} has an invalid ${field} list.`;
  }

  if (!isRecord(value.longevity)) return `Pet ${index + 1} is missing longevity data.`;
  for (const field of ["prevention", "routines", "watchlist", "qualityOfLifeNotes"]) {
    if (!isRecordArray(value.longevity[field], () => true)) return `Pet ${index + 1} has invalid longevity data.`;
  }

  if (typeof value.updatedAt !== "string") return `Pet ${index + 1} is missing its update timestamp.`;
  return null;
}

function parseImportedMemory(value: unknown): { data?: AppMemoryData; error?: string } {
  let candidate: unknown = value;

  if (isRecord(value) && !Array.isArray(value.pets) && isRecord(value.profile)) {
    candidate = {
      pets: [value],
      activePetId: typeof value.id === "string" ? value.id : "",
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
    };
  }

  if (!isRecord(candidate) || !Array.isArray(candidate.pets)) {
    return { error: "This is not a Pet Health Memory JSON backup." };
  }
  if (candidate.pets.length === 0 || candidate.pets.length > 25) {
    return { error: "A backup must contain between 1 and 25 pets." };
  }

  const petIds = new Set<string>();
  for (let index = 0; index < candidate.pets.length; index += 1) {
    const pet = candidate.pets[index];
    const error = validateImportedPet(pet, index);
    if (error) return { error };
    const petId = (pet as Record<string, unknown>).id as string;
    if (petIds.has(petId)) return { error: "The backup contains duplicate pet IDs." };
    petIds.add(petId);
  }

  return { data: normalizeAppMemoryData(candidate, false) };
}

function newestPetTimestamp(pets: PetMemoryData[]) {
  return pets
    .map((pet) => pet.updatedAt)
    .sort((a, b) => safeTimestamp(b) - safeTimestamp(a))[0] ?? new Date().toISOString();
}

function createBlankPetMemory(): PetMemoryData {
  const now = new Date().toISOString();
  return {
    ...seedData,
    id: newId("pet"),
    profile: {
      ...seedData.profile,
      name: "",
      species: "Dog",
      customSpecies: "",
      breed: "",
      customBreed: "",
      birthDate: "",
      sex: "",
      weightKg: 0,
      microchip: "",
      insurance: "",
      allergies: [],
      conditions: [],
      careInstructions: [],
      vets: []
    },
    events: [],
    medications: [],
    symptoms: [],
    expenses: [],
    weights: [],
    reminders: [],
    documents: [],
    longevity: {
      prevention: [],
      routines: [],
      watchlist: [],
      qualityOfLifeNotes: []
    },
    onboarding: { ...emptyOnboarding },
    sectionUpdatedAt: {
      profile: now,
      contacts: now,
      medications: now
    },
    updatedAt: now
  };
}

function saveLocalPetMemory(data: AppMemoryData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return null;
  } catch {
    return "Local browser storage is full or unavailable. Export a backup before closing.";
  }
}

function clearLocalPetMemory() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return "Could not clear local browser storage in this browser.";
  }
  return null;
}

function safeTimestamp(value?: string | null) {
  const timestamp = new Date(value ?? "").getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function PetHealthDashboard() {
  const [appData, setAppData] = useState<AppMemoryData>(seedAppData);
  const [ready, setReady] = useState(false);
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isSupabaseConfigured ? "checking" : "local");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [profileEditPetId, setProfileEditPetId] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [appNotice, setAppNotice] = useState<AppNotice | null>(null);
  const cloudReadyForUser = useRef<string | null>(null);
  const loadedStoredLocalCopy = useRef(false);
  const skipNextCloudSave = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const data = appData.pets.find((pet) => pet.id === appData.activePetId) ?? appData.pets[0] ?? seedData;

  useEffect(() => {
    let mounted = true;
    registerServiceWorker();

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        loadedStoredLocalCopy.current = true;
        setAppData(normalizeAppMemoryData(JSON.parse(stored)));
      }
    } catch {
      setAppData(seedAppData);
    } finally {
      setReady(true);
    }

    if (!supabase) {
      setSyncStatus("local");
      setAuthMessage("Local browser storage is active. Add Supabase env vars to enable accounts and sync.");
      return;
    }

    setSyncStatus("checking");
    supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (!mounted) return;
      if (error) {
        setSyncStatus("error");
        setAuthMessage(error.message);
        return;
      }
      const sessionUser = sessionData.session?.user ?? null;
      setUser(sessionUser);
      setSyncStatus(sessionUser ? "loading-cloud" : "signed-out");
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      cloudReadyForUser.current = null;
      skipNextCloudSave.current = false;
      setUser(session?.user ?? null);
      setSyncStatus(session?.user ? "loading-cloud" : "signed-out");
      if (!session?.user) {
        setAuthMessage("Signed out. Sign in again to view your pet household.");
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!ready || !client || !user) return;

    let cancelled = false;

    const loadCloudMemory = async () => {
      setSyncStatus("loading-cloud");
      const { data: row, error } = await client
        .from("pet_memories")
        .select("data, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setSyncStatus("error");
        setAuthMessage(error.message);
        return;
      }

      if (row?.data) {
        const remoteData = normalizeAppMemoryData(row.data);
        const remoteUpdatedAt = Math.max(safeTimestamp(remoteData.updatedAt), safeTimestamp(row.updated_at));
        const localUpdatedAt = safeTimestamp(appData.updatedAt);

        cloudReadyForUser.current = user.id;

        if (loadedStoredLocalCopy.current && localUpdatedAt > remoteUpdatedAt + 1000) {
          setSyncStatus("conflict");
          setAuthMessage(
            "This browser has newer local changes than the cloud copy. Use Sync now to upload this browser copy, or export JSON before continuing."
          );
          return;
        }

        skipNextCloudSave.current = true;
        setAppData(remoteData);
        setAuthMessage(`Loaded synced data${row.updated_at ? ` from ${formatDate(row.updated_at, true)}` : ""}.`);
      } else {
        const saveError = await savePetMemoryToCloud(user.id, appData);
        if (saveError) {
          setSyncStatus("error");
          setAuthMessage(saveError);
          return;
        }
        setAuthMessage("Migrated this browser household copy to your new synced account.");
      }

      setSyncStatus("synced");
    };

    loadCloudMemory();

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  useEffect(() => {
    if (!ready) return;
    const localSaveError = saveLocalPetMemory(appData);
    if (localSaveError) {
      setAuthMessage(localSaveError);
    }

    if (!supabase || !user || cloudReadyForUser.current !== user.id) return;
    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSyncStatus("saving");
    saveTimer.current = setTimeout(async () => {
      const saveError = await savePetMemoryToCloud(user.id, appData);
      if (saveError) {
        setSyncStatus("error");
        setAuthMessage(saveError);
        return;
      }
      setSyncStatus("synced");
      setAuthMessage(`Synced ${formatDate(new Date().toISOString(), true)}.`);
    }, 900);
  }, [appData, ready, user]);

  const commit: CommitPetMemory = (updater, sections, petId) => {
    setAppData((current) => {
      const updatedAt = new Date().toISOString();
      const targetPetId = petId ?? current.activePetId;
      const changedSections = sections ? (Array.isArray(sections) ? sections : [sections]) : [];
      return {
        ...current,
        pets: current.pets.map((pet) => {
          if (pet.id !== targetPetId) return pet;
          const updatedPet = updater(pet);
          const sectionUpdatedAt = changedSections.reduce<PetSectionTimestamps>(
            (timestamps, section) => ({ ...timestamps, [section]: updatedAt }),
            { ...pet.sectionUpdatedAt }
          );
          return { ...updatedPet, sectionUpdatedAt, updatedAt };
        }),
        updatedAt
      };
    });
  };

  const registerUndo: RegisterUndo = (message, restore) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoAction({ id: newId("undo"), message, restore });
    undoTimer.current = setTimeout(() => {
      setUndoAction(null);
      undoTimer.current = null;
    }, 8000);
  };

  const undoLastAction = () => {
    if (!undoAction) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoAction(null);
    undoTimer.current = null;
    undoAction.restore();
  };

  const dismissUndo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndoAction(null);
  };

  const showNotice = (message: string, tone: AppNotice["tone"] = "info") => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setAppNotice({ id: newId("notice"), message, tone });
    noticeTimer.current = setTimeout(() => {
      setAppNotice(null);
      noticeTimer.current = null;
    }, 6000);
  };

  const setActivePetId = (petId: string) => {
    setAppData((current) => {
      if (!current.pets.some((pet) => pet.id === petId)) return current;
      return { ...current, activePetId: petId, updatedAt: new Date().toISOString() };
    });
    setActiveView("overview");
  };

  const addPet = () => {
    const pet = createBlankPetMemory();
    const updatedAt = new Date().toISOString();
    setAppData((current) => ({
      ...current,
      pets: [...current.pets, pet],
      activePetId: pet.id,
      updatedAt
    }));
    setProfileEditPetId(pet.id);
    setActiveView("profile");
  };

  const removeActivePet = () => {
    if (appData.pets.length <= 1) return;
    if (!window.confirm(`Remove ${data.profile.name || "this pet"} from this household? Export JSON first if you need a backup.`)) return;

    const removedPet = data;
    const removedIndex = appData.pets.findIndex((pet) => pet.id === data.id);
    const previousActivePetId = appData.activePetId;
    const remainingPets = appData.pets.filter((pet) => pet.id !== data.id);
    setAppData({
      pets: remainingPets,
      activePetId: remainingPets[0]?.id ?? seedData.id,
      updatedAt: new Date().toISOString()
    });
    setActiveView("overview");
    registerUndo(`${removedPet.profile.name || "Pet"} was removed.`, () => {
      setAppData((current) => {
        if (current.pets.some((pet) => pet.id === removedPet.id)) return current;
        const pets = [...current.pets];
        pets.splice(Math.max(0, Math.min(removedIndex, pets.length)), 0, removedPet);
        return {
          ...current,
          pets,
          activePetId: previousActivePetId,
          updatedAt: new Date().toISOString()
        };
      });
    });
  };

  const importJson = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      setAuthMessage("Choose a .json backup exported by Pet Health Memory.");
      showNotice("Choose a .json backup exported by Pet Health Memory.", "error");
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setAuthMessage("That backup is larger than the 5 MB import limit.");
      showNotice("That backup is larger than the 5 MB import limit.", "error");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text()) as unknown;
    } catch {
      setAuthMessage("That file is not valid JSON and was not imported.");
      showNotice("That file is not valid JSON and was not imported.", "error");
      return;
    }

    const result = parseImportedMemory(parsed);
    if (!result.data) {
      setAuthMessage(result.error ?? "That backup could not be imported.");
      showNotice(result.error ?? "That backup could not be imported.", "error");
      return;
    }
    if (
      !window.confirm(
        `Import ${result.data.pets.length} pet${result.data.pets.length === 1 ? "" : "s"} from ${file.name}?\n\nThis replaces the household currently open in this account or browser. Export the current household first if you need a backup.`
      )
    ) {
      return;
    }

    const importedAt = new Date().toISOString();
    const importedData: AppMemoryData = {
      ...result.data,
      pets: result.data.pets.map((pet) => (pet.id === result.data?.activePetId ? { ...pet, updatedAt: importedAt } : pet)),
      updatedAt: importedAt
    };
    setAppData(importedData);
    setProfileEditPetId(null);
    setActiveView("overview");
    setAuthMessage(`Imported ${importedData.pets.length} pet${importedData.pets.length === 1 ? "" : "s"} from ${file.name}.`);
    showNotice(`Imported ${importedData.pets.length} pet${importedData.pets.length === 1 ? "" : "s"} from ${file.name}.`);
  };

  const sendMagicLink = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!supabase || !authEmail.trim()) return;

    const email = authEmail.trim().toLowerCase();
    if (!isEmailAllowedForTesting(email)) {
      setSyncStatus("signed-out");
      setAuthMessage("This email is not on the tester allowlist for this build.");
      return;
    }

    setSyncStatus("checking");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setSyncStatus("error");
      setAuthMessage(error.message);
      return;
    }

    setSyncStatus("signed-out");
    setAuthMessage("Check your email for a sign-in link.");
  };

  const signInWithPassword = async () => {
    if (!supabase) return;
    const email = authEmail.trim().toLowerCase();
    if (!email || !authPassword) {
      setSyncStatus("signed-out");
      setAuthMessage("Enter your tester email and beta password.");
      return;
    }
    if (!isEmailAllowedForTesting(email)) {
      setSyncStatus("signed-out");
      setAuthMessage("This email is not on the tester allowlist for this build.");
      return;
    }

    setSyncStatus("checking");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: authPassword
    });

    if (error) {
      setSyncStatus("error");
      setAuthMessage(error.message);
      return;
    }

    setAuthPassword("");
    setAuthMessage("Signed in. Loading your synced pet household.");
  };

  const createPasswordAccount = async () => {
    if (!supabase) return;
    const email = authEmail.trim().toLowerCase();
    if (!email || !authPassword) {
      setSyncStatus("signed-out");
      setAuthMessage("Enter your tester email and choose a beta password.");
      return;
    }
    if (!isEmailAllowedForTesting(email)) {
      setSyncStatus("signed-out");
      setAuthMessage("This email is not on the tester allowlist for this build.");
      return;
    }
    if (authPassword.length < 8) {
      setSyncStatus("signed-out");
      setAuthMessage("Use at least 8 characters for the beta password.");
      return;
    }

    setSyncStatus("checking");
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password: authPassword,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setSyncStatus("error");
      setAuthMessage(error.message);
      return;
    }

    setAuthPassword("");
    setAuthMessage(
      signUpData.session
        ? "Account created. Loading your synced pet household."
        : "Account created. If Supabase email confirmation is on, check your email before signing in."
    );
  };

  const signOut = async () => {
    if (!supabase) return;
    if (
      !window.confirm(
        "Sign out and clear this browser's local pet household copy?\n\nYour synced cloud data will remain in your account. Use Delete synced data only if you want to remove the cloud copy too."
      )
    ) {
      return;
    }
    await supabase.auth.signOut();
    cloudReadyForUser.current = null;
    skipNextCloudSave.current = false;
    const clearError = clearLocalPetMemory();
    loadedStoredLocalCopy.current = false;
    setAppData(seedAppData);
    setSyncStatus("signed-out");
    setAuthMessage(clearError ?? "Signed out and cleared this browser copy.");
  };

  const syncNow = async () => {
    if (!user) return;
    setSyncStatus("saving");
    const saveError = await savePetMemoryToCloud(user.id, appData);
    if (saveError) {
      setSyncStatus("error");
      setAuthMessage(saveError);
      return;
    }
    cloudReadyForUser.current = user.id;
    setSyncStatus("synced");
    setAuthMessage(`Synced ${formatDate(new Date().toISOString(), true)}.`);
  };

  const deleteCloudAndLocalData = async () => {
    if (!supabase || !user) return;
    if (
      !window.confirm(
        "Delete this account's synced pet household from the cloud and clear this browser copy?\n\nThis removes the Supabase record for this signed-in account. Export a JSON backup first if you may need the data later."
      )
    ) {
      return;
    }

    setSyncStatus("saving");
    const { error } = await supabase.from("pet_memories").delete().eq("user_id", user.id);
    if (error) {
      setSyncStatus("error");
      setAuthMessage(error.message);
      return;
    }

    await supabase.auth.signOut();
    cloudReadyForUser.current = null;
    skipNextCloudSave.current = false;
    const clearError = clearLocalPetMemory();
    loadedStoredLocalCopy.current = false;
    setUser(null);
    setAppData(seedAppData);
    setSyncStatus("signed-out");
    setAuthMessage(clearError ?? "Deleted synced data and cleared this browser copy.");
  };

  const metrics = useMemo(() => buildMetrics(data), [data]);
  const profileSetupRequired = useMemo(() => hasProfileErrors(validateProfile(data.profile)), [data.profile]);
  const currentView: ViewId = profileSetupRequired ? "profile" : activeView;
  const ActiveIcon = viewMeta[currentView].icon;
  const showMoreToolsNav = currentView === "more" || moreToolIds.includes(currentView);

  useEffect(() => {
    if (!ready || !profileSetupRequired) return;
    setActiveView("profile");
    setProfileEditPetId(data.id);
  }, [data.id, profileSetupRequired, ready]);

  const requestView = (view: ViewId) => {
    if (profileSetupRequired && view !== "profile") {
      setActiveView("profile");
      setProfileEditPetId(data.id);
      return;
    }
    if (view === "emergency" && !data.onboarding.emergencySummaryReviewed) {
      commit((current) => ({
        ...current,
        onboarding: { ...current.onboarding, emergencySummaryReviewed: true }
      }));
    }
    setActiveView(view);
  };

  if (isSupabaseConfigured && !user) {
    return (
      <AuthLanding
        email={authEmail}
        password={authPassword}
        syncStatus={syncStatus}
        message={authMessage}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSendMagicLink={sendMagicLink}
        onSignInWithPassword={signInWithPassword}
        onCreatePasswordAccount={createPasswordAccount}
      />
    );
  }

  return (
    <div className="print-root min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="no-print pb-5">
          <div className="rounded-xl border border-ink/10 bg-white/90 p-4 shadow-soft sm:p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="order-2 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start xl:order-1">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-pine text-white shadow-soft">
                  <PawPrint className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-mist px-3 py-1 text-[11px] font-semibold uppercase tracking-normal text-pine">
                      Pet Health Memory
                    </span>
                    <span className="rounded-full border border-ink/10 bg-ivory px-3 py-1 text-[11px] font-semibold uppercase tracking-normal text-muted">
                      Longevity tracker
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
                    <h1 className="text-3xl font-semibold leading-none tracking-normal text-ink sm:text-4xl">
                      {data.profile.name || "New pet"}
                    </h1>
                    <span className="mb-1 rounded-lg border border-pine/15 bg-pine/5 px-2.5 py-1 text-sm font-semibold text-pine">
                      Care dashboard
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                    A vet-ready memory for symptoms, meds, visits, costs, and care instructions.
                  </p>
                  <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
                    <PetFact label="Species" value={displaySpecies(data.profile)} />
                    <PetFact label="Breed" value={displayBreed(data.profile)} />
                    <PetFact label="Age" value={getAge(data.profile.birthDate)} />
                    <PetFact label="Weight" value={formatWeightKg(data.profile.weightKg)} />
                  </dl>
                </div>
              </div>
            <div className="order-1 flex w-full flex-wrap items-center justify-between gap-2 sm:justify-start xl:order-2 xl:w-auto xl:justify-end">
              <ActionButton icon={AlertTriangle} label="Emergency summary" onClick={() => requestView("emergency")} disabled={profileSetupRequired} />
              <AppMenu
                pets={appData.pets}
                activePetId={data.id}
                configured={isSupabaseConfigured}
                user={user}
                syncStatus={syncStatus}
                message={authMessage}
                onPetChange={setActivePetId}
                onAddPet={addPet}
                onRemovePet={removeActivePet}
                onExportJson={() => downloadJson(appData)}
                onImportJson={importJson}
                onResetSample={() => {
                  clearLocalPetMemory();
                  loadedStoredLocalCopy.current = false;
                  setAppData(seedAppData);
                }}
                onSyncNow={syncNow}
                onSignOut={signOut}
                onDeleteData={deleteCloudAndLocalData}
              />
            </div>
            </div>
          </div>

          <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Dashboard views">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = item.id === currentView || (item.id === "more" && !primaryNavIds.includes(currentView));
              const disabled = profileSetupRequired;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => requestView(item.id)}
                  disabled={disabled}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    selected
                      ? "border-pine bg-pine text-white shadow-soft"
                      : disabled
                        ? "border-ink/10 bg-white/50 text-muted/60"
                        : "border-ink/10 bg-white/80 text-ink hover:border-pine/40 hover:bg-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {showMoreToolsNav && (
            <nav className="mt-3 flex gap-2 overflow-x-auto rounded-xl border border-ink/10 bg-white/70 p-2" aria-label="More tools">
              {moreToolItems.map((item) => {
                const selected = item.view === currentView;
                const disabled = profileSetupRequired && item.view !== "profile";
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => requestView(item.view)}
                    disabled={disabled}
                    className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      selected
                        ? "border-pine bg-pine text-white shadow-sm"
                        : disabled
                          ? "border-transparent bg-ivory/60 text-muted/50"
                          : "border-transparent bg-ivory text-muted hover:border-pine/20 hover:bg-white hover:text-ink"
                    }`}
                  >
                    {item.title}
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        <main className="mt-6">
          <div className="no-print mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted">
              <ActiveIcon className="h-4 w-4" aria-hidden="true" />
              <span>{viewMeta[currentView].label}</span>
            </div>
            <SaveStateIndicator syncStatus={syncStatus} updatedAt={data.updatedAt} />
          </div>

          {profileSetupRequired && (
            <div className="no-print mb-5 rounded-lg border border-amber/20 bg-amber/10 p-4 text-sm leading-6 text-ink">
              <p className="font-semibold">Finish this pet profile to unlock the care dashboard.</p>
              <p className="mt-1 text-muted">Name, species, breed/type, birth date, sex, and weight are required so the health memory and vet summary start from a reliable record.</p>
            </div>
          )}

          {currentView === "overview" && (
            <OverviewView data={data} metrics={metrics} commit={commit} setActiveView={requestView} />
          )}
          {currentView === "care" && <CarePlanView data={data} metrics={metrics} commit={commit} setActiveView={requestView} />}
          {currentView === "more" && <MoreView data={data} metrics={metrics} setActiveView={requestView} />}
          {currentView === "profile" && (
            <ProfileView
              data={data}
              commit={commit}
              startInEditMode={profileSetupRequired || profileEditPetId === data.id}
              setupRequired={profileSetupRequired}
              onStartInEditModeConsumed={() => setProfileEditPetId(null)}
              registerUndo={registerUndo}
            />
          )}
          {currentView === "timeline" && <TimelineView data={data} commit={commit} />}
          {currentView === "meds" && <MedicationView data={data} commit={commit} registerUndo={registerUndo} />}
          {currentView === "symptoms" && <SymptomView data={data} commit={commit} />}
          {currentView === "expenses" && <ExpenseView data={data} commit={commit} />}
          {currentView === "trends" && <TrendsView data={data} metrics={metrics} commit={commit} />}
          {currentView === "longevity" && <LongevityView data={data} metrics={metrics} commit={commit} />}
          {currentView === "recent" && <RecentView data={data} />}
          {currentView === "emergency" && <EmergencyView data={data} />}
        </main>
      </div>
      {undoAction && <UndoBanner message={undoAction.message} onUndo={undoLastAction} onDismiss={dismissUndo} />}
      {appNotice && (
        <AppNoticeBanner
          message={appNotice.message}
          tone={appNotice.tone}
          onDismiss={() => {
            if (noticeTimer.current) clearTimeout(noticeTimer.current);
            noticeTimer.current = null;
            setAppNotice(null);
          }}
        />
      )}
    </div>
  );
}

function SaveStateIndicator({ syncStatus, updatedAt }: { syncStatus: SyncStatus; updatedAt: string }) {
  const isBusy = syncStatus === "saving" || syncStatus === "checking" || syncStatus === "loading-cloud";
  const hasSyncIssue = syncStatus === "error" || syncStatus === "conflict";
  const Icon = isBusy ? RefreshCcw : hasSyncIssue ? CloudOff : CheckCircle2;
  const label = isBusy
    ? syncStatus === "saving"
      ? "Saving changes"
      : "Checking saved data"
    : hasSyncIssue
      ? "Saved locally; sync needs attention"
      : syncStatus === "synced"
        ? "All changes synced"
        : "Saved in this browser";

  return (
    <div
      className={`inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
        hasSyncIssue ? "border-coral/20 bg-coral/5 text-coral" : "border-ink/10 bg-white/75 text-muted"
      }`}
      aria-live="polite"
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${isBusy ? "animate-spin" : ""}`} aria-hidden="true" />
      <span>{label}</span>
      <span className="hidden text-muted/70 sm:inline">· {formatDate(updatedAt, true)}</span>
    </div>
  );
}

function SectionUpdated({ value }: { value: string }) {
  return <p className="text-xs font-medium text-muted">Last updated {formatDate(value, true)}</p>;
}

function UndoBanner({ message, onUndo, onDismiss }: { message: string; onUndo: () => void; onDismiss: () => void }) {
  return (
    <div className="no-print fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-lg border border-ink/15 bg-ink px-4 py-3 text-white shadow-soft" role="status">
      <p className="min-w-0 flex-1 text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-mist"
      >
        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
        Undo
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
        aria-label="Dismiss undo message"
        title="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function AppNoticeBanner({ message, tone, onDismiss }: { message: string; tone: AppNotice["tone"]; onDismiss: () => void }) {
  return (
    <div
      className={`no-print fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-lg border px-4 py-3 shadow-soft ${
        tone === "error" ? "border-coral/30 bg-coral text-white" : "border-pine/20 bg-pine text-white"
      }`}
      role={tone === "error" ? "alert" : "status"}
    >
      <p className="min-w-0 flex-1 text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
        aria-label="Dismiss message"
        title="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function PetFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-ivory px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-normal text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-5 text-ink">{value}</dd>
    </div>
  );
}

function AppMenu({
  pets,
  activePetId,
  configured,
  user,
  syncStatus,
  message,
  onPetChange,
  onAddPet,
  onRemovePet,
  onExportJson,
  onImportJson,
  onResetSample,
  onSignOut,
  onSyncNow,
  onDeleteData
}: {
  pets: PetMemoryData[];
  activePetId: string;
  configured: boolean;
  user: User | null;
  syncStatus: SyncStatus;
  message: string;
  onPetChange: (petId: string) => void;
  onAddPet: () => void;
  onRemovePet: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onResetSample: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  onDeleteData: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const Icon = configured ? Cloud : CloudOff;
  const label = syncStatusLabel(syncStatus);
  const statusClass = syncStatusTone(syncStatus);
  const email = user?.email ?? "Account";
  const activePet = pets.find((pet) => pet.id === activePetId) ?? pets[0];

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const runAndClose = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label="Open app menu"
        className="inline-flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-soft transition hover:border-pine/40 hover:bg-mist"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
        <span>Menu</span>
        <ChevronDown className={`h-4 w-4 text-muted transition ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isOpen && <div className="z-20 mt-2 rounded-lg border border-ink/10 bg-white p-4 shadow-soft sm:absolute sm:right-0 sm:w-[28rem]">
        <div className="space-y-5">
          <section>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted">Pet household</p>
            <div className="mt-3 rounded-lg border border-ink/10 bg-ivory p-3">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Active pet
                <select
                  value={activePetId}
                  onChange={(event) => {
                    onPetChange(event.target.value);
                    setIsOpen(false);
                  }}
                  className="input"
                >
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.profile.name || "Unnamed pet"} · {displaySpecies(pet.profile)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs leading-5 text-muted">
                {activePet ? displayBreed(activePet.profile) : "Species details not set"} · {activePet ? getAge(activePet.profile.birthDate) : "Age not set"}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <ActionButton icon={Plus} label="Add pet" onClick={() => runAndClose(onAddPet)} variant="secondary" />
                {pets.length > 1 ? (
                  <ActionButton icon={Trash2} label="Remove pet" onClick={() => runAndClose(onRemovePet)} variant="danger" />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-coral/20 bg-coral/5 px-3 py-2 text-sm font-semibold text-coral/60 opacity-60"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Remove pet
                  </button>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted">Account</p>
              <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusClass}`}>{label}</span>
            </div>
            <div className="mt-3 rounded-lg border border-ink/10 bg-white p-3">
              <div className="flex items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${configured ? "bg-mist text-pine" : "bg-oat text-muted"}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{configured ? "Account sync" : "Local preview"}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {configured
                      ? user
                        ? `Signed in as ${email}.`
                        : "Sign in to sync this pet household across devices."
                      : "Sign-out appears here after logging into the deployed app. This local preview is not connected to Supabase."}
                  </p>
                  {message && <p className="mt-1 text-xs font-medium text-muted">{message}</p>}
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {configured && user ? (
                  <>
                    <ActionButton icon={RefreshCcw} label="Sync now" onClick={() => runAndClose(onSyncNow)} variant="secondary" />
                    <ActionButton icon={LogOut} label="Sign out + clear this browser" onClick={() => runAndClose(onSignOut)} variant="danger" />
                    <ActionButton icon={Trash2} label="Delete synced data" onClick={() => runAndClose(onDeleteData)} variant="danger" />
                  </>
                ) : (
                  <>
                    <p className="rounded-lg bg-ivory p-3 text-sm leading-6 text-muted">
                      {configured ? "No account session is active." : "Local mode keeps data in this browser only."}
                    </p>
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-coral/20 bg-coral/5 px-3 py-2 text-sm font-semibold text-coral/60 opacity-60"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted">Data</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <ActionButton icon={Download} label="Export JSON" onClick={() => runAndClose(onExportJson)} variant="secondary" />
              <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-pine/40 hover:bg-mist">
                <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Import JSON</span>
                <input
                  className="sr-only"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    setIsOpen(false);
                    if (file) void onImportJson(file);
                  }}
                />
              </label>
              {!user && <ActionButton icon={RefreshCcw} label="Reset sample" onClick={() => runAndClose(onResetSample)} variant="secondary" />}
            </div>
          </section>
        </div>
      </div>}
    </div>
  );
}

function AuthLanding({
  email,
  password,
  syncStatus,
  message,
  onEmailChange,
  onPasswordChange,
  onSendMagicLink,
  onSignInWithPassword,
  onCreatePasswordAccount
}: {
  email: string;
  password: string;
  syncStatus: SyncStatus;
  message: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSendMagicLink: (event?: React.FormEvent<HTMLFormElement>) => void;
  onSignInWithPassword: () => void;
  onCreatePasswordAccount: () => void;
}) {
  const isBusy = syncStatus === "checking" || syncStatus === "loading-cloud";
  const benefits = [
    { icon: NotebookTabs, title: "Vet-ready memory", text: "Keep symptoms, visits, tests, meds, diet changes, behavior notes, and documents in one timeline." },
    { icon: Pill, title: "Care plan tracking", text: "Follow medications, reminders, physio routines, prevention items, and follow-ups without relying on memory." },
    { icon: AlertTriangle, title: "Emergency summary", text: "Quickly pull together allergies, conditions, active meds, vet contacts, and recent changes." },
    { icon: LineChart, title: "Pattern awareness", text: "Notice weight, symptoms, routine completion, and cost trends over time." }
  ];

  return (
    <div className="min-h-screen bg-ivory px-4 py-6 sm:px-6 lg:px-8">
      <main className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="py-6">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-pine text-white shadow-soft">
              <PawPrint className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-muted">
                A health memory and longevity tracker for serious pet parents.
              </p>
              <p className="text-lg font-semibold text-ink">Pet Health Memory</p>
            </div>
          </div>

          <p className="mb-3 inline-flex rounded-lg border border-pine/15 bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-normal text-pine">
            Private beta
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-ink sm:text-5xl">
            Remember the details when your pet needs you calm.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            A practical health timeline, care tracker, and vet-summary tool for senior pets, chronically managed pets,
            and families juggling medications, physio, recurring appointments, and expensive care.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article key={benefit.title} className="rounded-lg border border-ink/10 bg-white/80 p-4 shadow-soft">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-mist text-pine">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-semibold text-ink">{benefit.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{benefit.text}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-muted">
            <span className="rounded-lg border border-ink/10 bg-white px-3 py-2">Not medical advice</span>
            <span className="rounded-lg border border-ink/10 bg-white px-3 py-2">Built for care conversations</span>
            <span className="rounded-lg border border-ink/10 bg-white px-3 py-2">Works on phone and desktop</span>
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist text-pine">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-normal text-ink">Sign in to your pet household</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Your dashboard, pet records, and synced household data are available after login.
              </p>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSignInWithPassword();
            }}
            className="space-y-3"
          >
            <label className="block">
              <span className="text-sm font-semibold text-ink">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="you@example.com"
                className="input mt-2 w-full"
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Beta password"
                className="input mt-2 w-full"
                autoComplete="current-password"
                minLength={8}
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="submit"
                disabled={isBusy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-pine bg-pine px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut className="h-4 w-4 rotate-180" aria-hidden="true" />
                Sign in
              </button>
              <button
                type="button"
                onClick={onCreatePasswordAccount}
                disabled={isBusy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft transition hover:border-pine/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create account
              </button>
            </div>

            <button
              type="button"
              onClick={() => onSendMagicLink()}
              disabled={isBusy}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft transition hover:border-pine/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email me a sign-in link
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${syncStatusTone(syncStatus)}`}>
              {syncStatusLabel(syncStatus)}
            </span>
            {message && <p className="text-sm font-medium text-muted">{message}</p>}
          </div>

          <div className="mt-6 rounded-lg border border-ink/10 bg-ivory p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CheckCircle2 className="h-4 w-4 text-pine" aria-hidden="true" />
              For testing
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Use the email invited for this beta. If magic links are rate-limited, sign in with the beta password created
              for your tester account.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function PetSwitcher({
  pets,
  activePetId,
  onPetChange,
  onAddPet,
  onRemovePet
}: {
  pets: PetMemoryData[];
  activePetId: string;
  onPetChange: (petId: string) => void;
  onAddPet: () => void;
  onRemovePet: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink/10 bg-white/85 p-2 shadow-sm">
      <label className="sr-only" htmlFor="active-pet">
        Active pet
      </label>
      <select id="active-pet" value={activePetId} onChange={(event) => onPetChange(event.target.value)} className="input min-w-44 bg-white">
        {pets.map((pet) => (
          <option key={pet.id} value={pet.id}>
            {pet.profile.name || "Unnamed pet"} · {displaySpecies(pet.profile)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onAddPet}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-pine bg-pine px-3 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink"
        aria-label="Add pet"
        title="Add pet"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
      {pets.length > 1 && (
        <button
          type="button"
          onClick={onRemovePet}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-coral/40 hover:bg-coral/5 hover:text-coral"
          aria-label="Remove active pet"
          title="Remove active pet"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function QuickActionRail({ setActiveView }: { setActiveView: (view: ViewId) => void }) {
  const actions: Array<{ label: string; view: ViewId; icon: LucideIcon; tone: string }> = [
    { label: "Log symptom", view: "symptoms", icon: HeartPulse, tone: "text-coral" },
    { label: "Vet visit", view: "timeline", icon: Stethoscope, tone: "text-clinical" },
    { label: "Medication", view: "meds", icon: Pill, tone: "text-lilac" },
    { label: "Cost", view: "expenses", icon: BadgeDollarSign, tone: "text-amber" },
    { label: "Reminder", view: "overview", icon: Bell, tone: "text-pine" }
  ];

  return (
    <section className="mt-4 grid gap-2 sm:grid-cols-5" aria-label="Quick actions">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={() => setActiveView(action.view)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white/85 px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-pine/30 hover:bg-mist"
          >
            <Icon className={`h-4 w-4 shrink-0 ${action.tone}`} aria-hidden="true" />
            <span className="truncate">{action.label}</span>
          </button>
        );
      })}
    </section>
  );
}

function OnboardingChecklist({
  data,
  commit,
  setActiveView
}: {
  data: PetMemoryData;
  commit: CommitPetMemory;
  setActiveView: (view: ViewId) => void;
}) {
  const items = [
    {
      id: "medications",
      title: "Review medications",
      detail: data.medications.length
        ? `${data.medications.length} medication${data.medications.length === 1 ? "" : "s"} recorded.`
        : data.onboarding.medicationsReviewed
          ? "Reviewed; no current medications listed."
          : "Add current medications, supplements, and refill notes.",
      complete: data.medications.length > 0 || data.onboarding.medicationsReviewed,
      view: "meds" as ViewId,
      skipLabel: data.medications.length === 0 && !data.onboarding.medicationsReviewed ? "No current meds" : undefined,
      onSkip: () =>
        commit((current) => ({
          ...current,
          onboarding: { ...current.onboarding, medicationsReviewed: true }
        }))
    },
    {
      id: "vets",
      title: "Add a vet contact",
      detail: data.profile.vets.length
        ? `${data.profile.vets.length} care contact${data.profile.vets.length === 1 ? "" : "s"} ready for summaries.`
        : "Add a primary vet or specialist for stressful visits.",
      complete: data.profile.vets.length > 0,
      view: "profile" as ViewId
    },
    {
      id: "reminders",
      title: "Review reminders",
      detail: data.reminders.length
        ? `${data.reminders.length} reminder${data.reminders.length === 1 ? "" : "s"} recorded.`
        : data.onboarding.remindersReviewed
          ? "Reviewed; no reminder needed yet."
          : "Add the next appointment, refill, or follow-up.",
      complete: data.reminders.length > 0 || data.onboarding.remindersReviewed,
      view: "care" as ViewId,
      skipLabel: data.reminders.length === 0 && !data.onboarding.remindersReviewed ? "Nothing due yet" : undefined,
      onSkip: () =>
        commit((current) => ({
          ...current,
          onboarding: { ...current.onboarding, remindersReviewed: true }
        }))
    },
    {
      id: "emergency",
      title: "Review emergency summary",
      detail: data.onboarding.emergencySummaryReviewed
        ? "Summary reviewed for a future vet conversation."
        : "Check conditions, allergies, medications, and contact details.",
      complete: data.onboarding.emergencySummaryReviewed,
      view: "emergency" as ViewId
    }
  ];
  const completedCount = items.filter((item) => item.complete).length;

  if (completedCount === items.length) return null;

  return (
    <Panel className="border-pine/15 bg-mist/55">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-pine shadow-sm">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Finish care setup</h2>
            <p className="mt-1 text-sm leading-6 text-muted">A short checklist to make this pet memory useful when care gets stressful.</p>
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-sm font-semibold text-pine">{completedCount} of {items.length} ready</p>
          <div className="mt-2 h-2 w-32 overflow-hidden rounded-lg bg-white" aria-hidden="true">
            <div className="h-full rounded-lg bg-pine transition-all" style={{ width: `${(completedCount / items.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="flex min-h-28 flex-col justify-between gap-3 rounded-lg border border-ink/10 bg-white/85 p-4">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  item.complete ? "bg-pine text-white" : "border border-ink/15 bg-ivory text-muted"
                }`}
              >
                {item.complete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {item.skipLabel && item.onSkip && (
                <button type="button" onClick={item.onSkip} className="px-2 py-1 text-xs font-semibold text-muted transition hover:text-ink">
                  {item.skipLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveView(item.view)}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-pine/15 bg-mist px-3 py-1.5 text-xs font-semibold text-pine transition hover:border-pine/35 hover:bg-sage/30"
              >
                {item.complete ? "Review" : "Open"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function OverviewView({
  data,
  metrics,
  commit,
  setActiveView
}: {
  data: PetMemoryData;
  metrics: ReturnType<typeof buildMetrics>;
  commit: CommitPetMemory;
  setActiveView: (view: ViewId) => void;
}) {
  const [reminder, setReminder] = useState<Reminder>(emptyReminder);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const today = todayInput();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(startOfToday);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  tomorrowEnd.setHours(23, 59, 59, 999);
  const recentStart = daysAgo(7);
  recentStart.setHours(0, 0, 0, 0);

  const todayReminders = [...data.reminders]
    .filter((item) => {
      const due = new Date(item.dueDate);
      return (!item.done && due <= tomorrowEnd) || (item.done && due >= recentStart && due <= tomorrowEnd);
    })
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
    .slice(0, 4);
  const routinePriority: Record<RoutineCategory, number> = {
    Medication: 0,
    Physio: 1,
    "Appetite/hydration": 2,
    Supplements: 3,
    Activity: 4,
    Rest: 5,
    Grooming: 6,
    Enrichment: 7,
    Custom: 8
  };
  const todayRoutines = [...data.longevity.routines]
    .filter((item) => item.cadence === "Daily")
    .sort(
      (a, b) =>
        Number(a.completionDates.includes(today)) - Number(b.completionDates.includes(today)) ||
        routinePriority[a.category] - routinePriority[b.category]
    )
    .slice(0, 3);
  const latestEvents = [...data.events].sort(sortByDateDesc("date")).slice(0, 3);
  const activeMeds = data.medications.filter((medication) => medication.status === "Active");
  const recentChanges = getRecentChanges(data, 7);
  const recent30 = getRecentChanges(data, 30);
  const weeklyItems = [
    ...recentChanges.events
      .filter((event) => event.type !== "symptom")
      .map((event) => ({ id: event.id, date: event.date, label: eventLabels[event.type], title: event.title })),
    ...recentChanges.symptoms.map((symptom) => ({
      id: symptom.id,
      date: symptom.dateTime,
      label: "Symptom",
      title: symptom.name
    })),
    ...recentChanges.documents.map((document) => ({
      id: document.id,
      date: document.date,
      label: "Document",
      title: document.title
    })),
    ...recentChanges.expenses.map((expense) => ({
      id: expense.id,
      date: expense.date,
      label: "Cost",
      title: `${expense.vendor} · ${currency(expense.amount)}`
    }))
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
  const healthNotesThisWeek = recentChanges.events.filter((event) => event.type !== "symptom").length;
  const scheduledCareCount = todayReminders.length + todayRoutines.length;
  const completedCareCount =
    todayReminders.filter((item) => item.done).length + todayRoutines.filter((item) => item.completionDates.includes(today)).length;
  const careProgress = scheduledCareCount ? Math.round((completedCareCount / scheduledCareCount) * 100) : 100;
  const readinessSignals = [
    {
      ready: data.profile.vets.length > 0,
      next: "Add a vet contact so the right details are close at hand.",
      view: "profile" as ViewId
    },
    {
      ready: recent30.events.length > 0 || recent30.symptoms.length > 0,
      next: "Log one recent health note or symptom.",
      view: "timeline" as ViewId
    },
    {
      ready: data.medications.length > 0 || data.onboarding.medicationsReviewed,
      next: "Review the medication list, even if there are no current medicines.",
      view: "meds" as ViewId
    },
    {
      ready:
        data.profile.conditions.length > 0 ||
        data.profile.allergies.length > 0 ||
        data.profile.careInstructions.length > 0,
      next: "Add an allergy, condition, or care instruction for context.",
      view: "profile" as ViewId
    }
  ];
  const missingReadiness = readinessSignals.find((signal) => !signal.ready);
  const readyForConversation = !missingReadiness;
  const emergencyReadyCount = [
    data.profile.allergies.length > 0,
    activeMeds.length > 0,
    data.profile.vets.length > 0,
    data.events.length > 0
  ].filter(Boolean).length;

  const submitReminder = () => {
    if (!reminder.title.trim()) return;
    commit((current) => ({
      ...current,
      reminders: [{ ...reminder, id: newId("rem") }, ...current.reminders]
    }));
    setReminder(emptyReminder());
    setShowReminderForm(false);
  };

  const toggleReminder = (item: Reminder) => {
    commit((current) => ({
      ...current,
      reminders: current.reminders.map((candidate) =>
        candidate.id === item.id ? { ...candidate, done: !candidate.done } : candidate
      )
    }));
  };

  const toggleRoutineToday = (routine: HabitRoutine) => {
    const hasToday = routine.completionDates.includes(today);
    const completionDates = hasToday
      ? routine.completionDates.filter((date) => date !== today)
      : [...routine.completionDates, today].sort();
    commit((current) => ({
      ...current,
      longevity: {
        ...current.longevity,
        routines: current.longevity.routines.map((item) =>
          item.id === routine.id ? { ...item, completionDates } : item
        )
      }
    }));
  };

  return (
    <div className="space-y-6">
      <OnboardingChecklist data={data} commit={commit} setActiveView={setActiveView} />

      <Panel className="overflow-hidden border-pine/15 bg-white/95 p-0">
        <div className="border-b border-ink/10 bg-mist/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionTitle icon={ListChecks} title="Today care" />
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Here is what needs attention today. Everything else can wait.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={Plus}
                label={showReminderForm ? "Close form" : "Add reminder"}
                onClick={() => setShowReminderForm((current) => !current)}
                variant="secondary"
              />
              <ActionButton icon={ArrowRight} label="Care plan" onClick={() => setActiveView("care")} variant="secondary" />
            </div>
          </div>
          {scheduledCareCount > 0 && (
            <div className="mt-5 max-w-2xl">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted">
                <span>{completedCareCount} of {scheduledCareCount} complete</span>
                <span>{careProgress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-pine/10">
                <div className="h-full rounded-full bg-pine transition-all" style={{ width: `${careProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-2 sm:px-6">
          {scheduledCareCount > 0 ? (
            <div className="divide-y divide-ink/10">
              {todayReminders.map((item) => {
                const due = new Date(item.dueDate);
                const overdue = !item.done && due < startOfToday;
                const dueToday = due >= startOfToday && due < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
                return (
                  <TodayCareRow
                    key={item.id}
                    icon={Bell}
                    title={item.title}
                    detail={`${item.type} · ${item.done ? "Completed" : overdue ? "Overdue" : dueToday ? "Today" : "Tomorrow"} · ${formatDate(item.dueDate, true)}`}
                    complete={item.done}
                    urgent={overdue}
                    onToggle={() => toggleReminder(item)}
                  />
                );
              })}
              {todayRoutines.map((routine) => (
                <TodayCareRow
                  key={routine.id}
                  icon={Activity}
                  title={routine.title}
                  detail={`${routine.category} · Daily routine`}
                  complete={routine.completionDates.includes(today)}
                  onToggle={() => toggleRoutineToday(routine)}
                />
              ))}
            </div>
          ) : (
            <div className="py-5">
              <GuidedEmptyState
                icon={CheckCircle2}
                title="Nothing scheduled for today"
                description="You are caught up. Add a reminder when there is a medicine, follow-up, or home-care task to remember."
                actionLabel="Add reminder"
                onAction={() => setShowReminderForm(true)}
              />
            </div>
          )}

          {showReminderForm && (
            <div className="my-5 grid gap-3 rounded-lg border border-pine/15 bg-ivory p-4 sm:grid-cols-2">
              <Field label="Task">
                <input
                  value={reminder.title}
                  onChange={(event) => setReminder({ ...reminder, title: event.target.value })}
                  placeholder="e.g. Book physio recheck"
                  className="input"
                />
              </Field>
              <Field label="Type">
                <select
                  value={reminder.type}
                  onChange={(event) => setReminder({ ...reminder, type: event.target.value as Reminder["type"] })}
                  className="input"
                >
                  {["Medication", "Appointment", "Follow-up", "Refill", "Home care"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Due">
                <input
                  type="datetime-local"
                  value={reminder.dueDate}
                  onChange={(event) => setReminder({ ...reminder, dueDate: event.target.value })}
                  className="input"
                />
              </Field>
              <div className="flex items-end">
                <ActionButton icon={Plus} label="Save reminder" onClick={submitReminder} />
              </div>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Panel className="bg-white/95">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionTitle icon={CalendarClock} title="This week" />
              <p className="mt-3 text-sm leading-6 text-muted">
                {healthNotesThisWeek} health {healthNotesThisWeek === 1 ? "note" : "notes"} · {recentChanges.symptoms.length} {recentChanges.symptoms.length === 1 ? "symptom" : "symptoms"} · {currency(recentChanges.expenseTotal)} care cost
              </p>
            </div>
            <ActionButton icon={ArrowRight} label="Review changes" onClick={() => setActiveView("recent")} variant="secondary" />
          </div>
          {weeklyItems.length > 0 ? (
            <div className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
              {weeklyItems.map((item) => (
                <div key={`${item.label}-${item.id}`} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-muted">{item.label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-ink">{item.title}</p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-muted">{formatDate(item.date)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <GuidedEmptyState
                icon={NotebookTabs}
                title="No changes logged this week"
                description="Your first health note will start a clear story you can return to later."
                actionLabel="Add health note"
                onAction={() => setActiveView("timeline")}
              />
            </div>
          )}
        </Panel>

        <Panel className={readyForConversation ? "border-pine/20 bg-mist/65" : "border-clinical/15 bg-skywash/60"}>
          <SectionTitle icon={MessageSquareText} title="Vet conversation readiness" />
          <p className="mt-5 text-xl font-semibold leading-7 text-ink">
            {readyForConversation
              ? "You are ready to explain the last 30 days."
              : "Your last 30 days are still taking shape."}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {readyForConversation
              ? `${metrics.activeMedicationCount} active meds, ${metrics.symptomsLast30} symptoms, and ${currency(metrics.costLast30)} in care costs are organized with vet context.`
              : missingReadiness?.next}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ActionButton
              icon={readyForConversation ? ShieldCheck : ArrowRight}
              label={readyForConversation ? "Open vet summary" : "Add missing detail"}
              onClick={() => setActiveView(readyForConversation ? "emergency" : missingReadiness?.view ?? "profile")}
            />
            <span className="inline-flex items-center text-xs font-semibold text-muted">Not medical advice</span>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="bg-white/95">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle icon={NotebookTabs} title="Recent health memory" />
            <ActionButton icon={Plus} label="Add event" onClick={() => setActiveView("timeline")} variant="secondary" />
          </div>
          <div className="mt-4 space-y-3">
            {latestEvents.map((event) => (
              <TimelineItem key={event.id} event={event} />
            ))}
            {latestEvents.length === 0 && (
              <GuidedEmptyState
                icon={NotebookTabs}
                title="No health memories yet"
                description="Add a vet visit, behavior change, test result, or care note. Short notes are enough to begin."
                actionLabel="Add first event"
                onAction={() => setActiveView("timeline")}
              />
            )}
          </div>
        </Panel>

        <aside className="space-y-5">
          <Panel className="border-pine/10 bg-mist/70">
            <SectionTitle icon={Plus} title="Quick log" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <ActionButton icon={HeartPulse} label="Log symptom" onClick={() => setActiveView("symptoms")} variant="secondary" />
              <ActionButton icon={Stethoscope} label="Vet visit" onClick={() => setActiveView("timeline")} variant="secondary" />
              <ActionButton icon={Pill} label="Medication" onClick={() => setActiveView("meds")} variant="secondary" />
              <ActionButton icon={BadgeDollarSign} label="Cost" onClick={() => setActiveView("expenses")} variant="secondary" />
            </div>
          </Panel>

          <Panel className="border-coral/15 bg-coral/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionTitle icon={AlertTriangle} title="Vet essentials" />
              <ActionButton icon={Printer} label="Print" onClick={() => setActiveView("emergency")} variant="secondary" />
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <Definition label="Primary vet" value={`${data.profile.vets[0]?.clinic ?? "Not set"} · ${data.profile.vets[0]?.phone ?? ""}`} />
              <Definition label="After-hours" value={data.profile.vets[0]?.afterHours ?? "Not set"} />
              <Definition label="Microchip" value={data.profile.microchip || "Not set"} />
              <Definition label="Ready summary" value={`${emergencyReadyCount}/4 essentials complete`} />
            </dl>
          </Panel>
        </aside>
      </div>

      <Panel className="bg-ivory/70">
        <SectionTitle icon={Stethoscope} title="Care context" />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <InfoBlock title="Conditions" items={data.profile.conditions} />
          <InfoBlock title="Allergies" items={data.profile.allergies} danger />
          <InfoBlock title="Care instructions" items={data.profile.careInstructions} />
        </div>
      </Panel>
    </div>
  );
}

function TodayCareRow({
  icon: Icon,
  title,
  detail,
  complete,
  urgent = false,
  onToggle
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  complete: boolean;
  urgent?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-4">
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
          complete
            ? "border-pine bg-pine text-white"
            : urgent
              ? "border-coral/35 bg-coral/10 text-coral hover:bg-coral/20"
              : "border-ink/15 bg-white text-muted hover:border-pine/40 hover:bg-mist"
        }`}
        aria-label={complete ? `Mark ${title} incomplete` : `Mark ${title} complete`}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${urgent ? "bg-coral/10 text-coral" : "bg-mist text-pine"}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${complete ? "text-muted line-through" : "text-ink"}`}>{title}</p>
        <p className={`mt-1 text-xs font-medium ${urgent ? "text-coral" : "text-muted"}`}>{detail}</p>
      </div>
    </div>
  );
}

function GuidedEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-pine/20 bg-mist/35 p-5 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-white text-pine shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-pine/15 bg-white px-3 py-2 text-sm font-semibold text-pine transition hover:border-pine/35 hover:bg-mist"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function CarePlanView({
  data,
  metrics,
  commit,
  setActiveView
}: {
  data: PetMemoryData;
  metrics: ReturnType<typeof buildMetrics>;
  commit: (updater: (current: PetMemoryData) => PetMemoryData) => void;
  setActiveView: (view: ViewId) => void;
}) {
  const activeMeds = data.medications.filter((medication) => medication.status === "Active");
  const nextReminders = [...data.reminders]
    .filter((item) => !item.done)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);
  const preventionAttention = data.longevity.prevention
    .filter((item) => item.status === "Due soon" || item.status === "Overdue")
    .slice(0, 5);
  const prepQuestions = buildVetPrepQuestions(data).slice(0, 4);

  return (
    <div className="space-y-5">
      <Panel className="border-clinical/15 bg-white/90">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <SectionTitle icon={ClipboardList} title="Care plan" />
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Ongoing meds, follow-ups, prevention, routines, and vet questions in one practical place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Pill} label="Edit meds" onClick={() => setActiveView("meds")} variant="secondary" />
            <ActionButton icon={ShieldCheck} label="Longevity" onClick={() => setActiveView("longevity")} variant="secondary" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active meds" value={metrics.activeMedicationCount} icon={Pill} tone="text-lilac" />
          <Metric label="Open reminders" value={metrics.openReminderCount} icon={Bell} tone="text-amber" />
          <Metric label="Prevention attention" value={metrics.preventionAttentionCount} icon={ListChecks} tone="text-coral" />
          <Metric label="7-day routines" value={`${metrics.routineCompletionRate}%`} icon={Activity} tone="text-pine" />
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle icon={Pill} title="Medication schedule" />
            <ActionButton icon={Plus} label="Add medication" onClick={() => setActiveView("meds")} variant="secondary" />
          </div>
          <div className="mt-5 space-y-3">
            {activeMeds.length ? (
              activeMeds.map((medication) => (
                <div key={medication.id} className="rounded-lg border border-ink/10 bg-white/75 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink">{medication.name}</h3>
                    <StatusPill label={medication.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {medication.dosage} · {medication.frequency}
                  </p>
                  {medication.refillNotes && <p className="mt-2 text-sm leading-6 text-ink">{medication.refillNotes}</p>}
                </div>
              ))
            ) : (
              <EmptyState text="No active medications right now." />
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={Bell} title="Follow-ups and reminders" />
          <div className="mt-5 space-y-3">
            {nextReminders.length ? (
              nextReminders.map((reminder) => <ReminderRow key={reminder.id} reminder={reminder} commit={commit} />)
            ) : (
              <EmptyState text="No open reminders. Add one from Today when something needs follow-up." />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle icon={ListChecks} title="Preventive care attention" />
          <div className="mt-5 space-y-3">
            {preventionAttention.length ? (
              preventionAttention.map((item) => (
                <div key={item.id} className="rounded-lg border border-ink/10 bg-white/75 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted">{item.category}</p>
                    </div>
                    <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${preventionStatusTone(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {item.nextDueDate ? `Next due ${formatDate(item.nextDueDate)}. ` : ""}
                    {item.notes}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState text="No due-soon or overdue prevention items." />
            )}
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle icon={MessageSquareText} title="Vet conversation prep" />
            <MedicalNote compact />
          </div>
          <ul className="mt-5 space-y-2 text-sm leading-6 text-ink">
            {prepQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          {prepQuestions.length === 0 && <EmptyState text="Add timeline events, prevention items, or watchlist notes to generate prep questions." />}
        </Panel>
      </div>
    </div>
  );
}

function MoreView({
  data,
  metrics,
  setActiveView
}: {
  data: PetMemoryData;
  metrics: ReturnType<typeof buildMetrics>;
  setActiveView: (view: ViewId) => void;
}) {
  const metaByView: Partial<Record<ViewId, string>> = {
    profile: `${data.profile.conditions.length} conditions`,
    meds: `${metrics.activeMedicationCount} active`,
    symptoms: `${metrics.symptomsLast30} in 30d`,
    expenses: currency(metrics.costLast30),
    longevity: `${metrics.routineCompletionRate}% routines`,
    recent: "Vet prep"
  };

  return (
    <div className="space-y-5">
      <Panel>
        <SectionTitle icon={ListChecks} title="More tools" />
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          The full health memory is still here, organized behind the main daily workflow.
        </p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moreToolItems.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.view}
              type="button"
              onClick={() => setActiveView(section.view)}
              className="rounded-lg border border-ink/10 bg-white/85 p-4 text-left shadow-soft transition hover:border-pine/30 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist text-pine">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="rounded-lg bg-oat px-2 py-1 text-xs font-semibold text-muted">{metaByView[section.view]}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink">{section.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{section.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileView({
  data,
  commit,
  startInEditMode = false,
  setupRequired = false,
  onStartInEditModeConsumed,
  registerUndo
}: {
  data: PetMemoryData;
  commit: CommitPetMemory;
  startInEditMode?: boolean;
  setupRequired?: boolean;
  onStartInEditModeConsumed?: () => void;
  registerUndo: RegisterUndo;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState<PetProfile>(() => cloneProfile(data.profile));
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [breedSearch, setBreedSearch] = useState(data.profile.breed);
  const [breedPickerOpen, setBreedPickerOpen] = useState(false);
  const profileErrors = useMemo(() => validateProfile(draftProfile), [draftProfile]);
  const profileHasErrors = hasProfileErrors(profileErrors);
  const showValidation = isEditing && (saveAttempted || profileHasErrors);
  const filteredDogBreedOptions = useMemo(() => {
    const search = breedSearch.trim().toLowerCase();
    const matches = search
      ? dogBreedOptions.filter((breed) => breed.toLowerCase().includes(search))
      : dogBreedOptions;
    return matches.slice(0, 12);
  }, [breedSearch]);

  useEffect(() => {
    if (!isEditing) {
      setDraftProfile(cloneProfile(data.profile));
      setBreedSearch(data.profile.breed);
      setBreedPickerOpen(false);
      setSaveAttempted(false);
    }
  }, [data.id, data.profile, isEditing]);

  useEffect(() => {
    if (!startInEditMode) return;
    setDraftProfile(cloneProfile(data.profile));
    setBreedSearch(data.profile.breed);
    setBreedPickerOpen(false);
    setIsEditing(true);
    setSaveAttempted(false);
    onStartInEditModeConsumed?.();
  }, [data.id, startInEditMode]);

  const startEditing = () => {
    setDraftProfile(cloneProfile(data.profile));
    setBreedSearch(data.profile.breed);
    setBreedPickerOpen(false);
    setIsEditing(true);
    setSaveAttempted(false);
  };

  const cancelEditing = () => {
    setDraftProfile(cloneProfile(data.profile));
    setBreedSearch(data.profile.breed);
    setBreedPickerOpen(false);
    setIsEditing(false);
    setSaveAttempted(false);
  };

  const saveProfile = () => {
    if (profileHasErrors) {
      setSaveAttempted(true);
      return;
    }
    const nextProfile = cleanProfile(cloneProfile(draftProfile));
    const removedVets = data.profile.vets
      .map((vet, index) => ({ vet: { ...vet }, index }))
      .filter(({ vet }) => !nextProfile.vets.some((item) => item.id === vet.id));
    const contactsChanged = JSON.stringify(data.profile.vets) !== JSON.stringify(nextProfile.vets);
    commit(
      (current) => ({ ...current, profile: nextProfile }),
      contactsChanged ? ["profile", "contacts"] : "profile"
    );
    if (removedVets.length > 0) {
      registerUndo(
        `${removedVets.length} vet contact${removedVets.length === 1 ? " was" : "s were"} removed.`,
        () =>
          commit(
            (current) => {
              const vets = [...current.profile.vets];
              removedVets.forEach(({ vet, index }) => {
                if (!vets.some((item) => item.id === vet.id)) {
                  vets.splice(Math.max(0, Math.min(index, vets.length)), 0, vet);
                }
              });
              return { ...current, profile: { ...current.profile, vets } };
            },
            "contacts",
            data.id
          )
      );
    }
    setIsEditing(false);
    setSaveAttempted(false);
  };

  const updateProfile = <K extends keyof PetProfile>(field: K, value: PetProfile[K]) => {
    setDraftProfile((current) => ({ ...current, [field]: value }));
  };

  const updateWeight = (value: string) => {
    if (!value.trim()) {
      updateProfile("weightKg", 0);
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const kg = weightUnit === "kg" ? parsed : lbToKg(parsed);
    updateProfile("weightKg", Math.round(kg * 10) / 10);
  };

  const selectDogBreed = (breed: string) => {
    setDraftProfile((current) => ({
      ...current,
      breed,
      customBreed: breed === "Other" ? current.customBreed ?? "" : ""
    }));
    setBreedSearch(breed);
    setBreedPickerOpen(false);
  };

  const searchDogBreed = (value: string) => {
    setBreedSearch(value);
    setBreedPickerOpen(true);
    updateProfile("breed", dogBreedOptions.includes(value) ? value : "");
  };

  const closeDogBreedPicker = () => {
    window.setTimeout(() => {
      setBreedPickerOpen(false);
      setBreedSearch((current) => (dogBreedOptions.includes(current) ? current : draftProfile.breed));
    }, 120);
  };

  const updateList = (field: "allergies" | "conditions" | "careInstructions", value: string) => {
    updateProfile(
      field,
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    );
  };

  const updateVet = <K extends keyof VetContact>(id: string, field: K, value: VetContact[K]) => {
    setDraftProfile((current) => ({
      ...current,
      vets: current.vets.map((vet) => (vet.id === id ? { ...vet, [field]: value } : vet))
    }));
  };

  const addVet = () => {
    setDraftProfile((current) => ({
      ...current,
      vets: [
        ...current.vets,
        {
          id: newId("vet"),
          clinic: "",
          clinician: "",
          role: "Specialist",
          phone: "",
          email: "",
          address: "",
          afterHours: ""
        }
      ]
    }));
  };

  const removeVet = (vet: VetContact) => {
    const label = vet.clinic || vet.clinician || "this contact";
    if (!window.confirm(`Delete ${label} from this draft? This will only be permanent after you save changes.`)) return;
    setDraftProfile((current) => ({
      ...current,
      vets: current.vets.filter((item) => item.id !== vet.id)
    }));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="lg:col-span-2 rounded-lg border border-ink/10 bg-white/85 p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">
              {setupRequired ? "Profile setup required" : isEditing ? "Editing profile details" : "Profile details are locked"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {setupRequired
                ? "Complete and save the required details before using the rest of the care dashboard."
                : isEditing
                  ? "Review your changes, then save them to the pet memory."
                  : "Press Edit before changing profile, medical notes, or vet contacts."}
            </p>
            {showValidation && profileHasErrors && (
              <p className="mt-2 text-sm font-semibold text-coral">Fill the required profile fields before saving.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                {!setupRequired && <ActionButton icon={X} label="Cancel" onClick={cancelEditing} variant="secondary" />}
                <ActionButton icon={Save} label="Save changes" onClick={saveProfile} disabled={profileHasErrors} />
              </>
            ) : (
              <ActionButton icon={Pencil} label="Edit" onClick={startEditing} variant="secondary" />
            )}
          </div>
        </div>
      </div>

      <Panel>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle icon={PawPrint} title="Pet profile" />
          <SectionUpdated value={data.sectionUpdatedAt.profile} />
        </div>
        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <Field label="Name" required error={showValidation ? profileErrors.name : undefined}>
              <input
                value={draftProfile.name}
                onChange={(event) => updateProfile("name", event.target.value)}
                disabled={!isEditing}
                required
                aria-invalid={Boolean(profileErrors.name)}
                className="input"
              />
            </Field>
            <Field label="Species" required error={showValidation ? profileErrors.species : undefined}>
              <select
                value={draftProfile.species}
                onChange={(event) => {
                  const species = event.target.value as PetProfile["species"];
                  setDraftProfile((current) => ({
                    ...current,
                    species,
                    breed: species === "Dog" && !dogBreedOptions.includes(current.breed) ? "" : current.breed,
                    customBreed: species === "Dog" && current.breed === "Other" ? current.customBreed ?? "" : "",
                    customSpecies: species === "Other" ? current.customSpecies ?? "" : current.customSpecies
                  }));
                  if (species === "Dog" && !dogBreedOptions.includes(draftProfile.breed)) {
                    setBreedSearch("");
                    setBreedPickerOpen(false);
                  }
                }}
                disabled={!isEditing}
                required
                aria-invalid={Boolean(profileErrors.species)}
                className="input"
              >
                {speciesOptions.map((species) => (
                  <option key={species}>{species}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <Field label="Species detail">
              <input
                value={draftProfile.customSpecies ?? ""}
                onChange={(event) => updateProfile("customSpecies", event.target.value)}
                placeholder="e.g. Bearded dragon, ferret, parrot"
                disabled={!isEditing}
                className="input"
              />
            </Field>
            <Field
              label="Breed / type"
              required
              error={showValidation ? profileErrors.breed : undefined}
              helper={draftProfile.species === "Dog" ? "Type to search, then choose a breed from the list. Choose Other if it is not listed." : undefined}
            >
              {draftProfile.species === "Dog" ? (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      value={breedSearch}
                      onChange={(event) => searchDogBreed(event.target.value)}
                      onFocus={() => isEditing && setBreedPickerOpen(true)}
                      onBlur={closeDogBreedPicker}
                      disabled={!isEditing}
                      required
                      aria-invalid={Boolean(profileErrors.breed)}
                      placeholder="Search breed list"
                      className="input"
                    />
                    {isEditing && breedPickerOpen && (
                      <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-ink/10 bg-white p-1 shadow-soft">
                        {filteredDogBreedOptions.length > 0 ? (
                          filteredDogBreedOptions.map((breed) => (
                            <button
                              key={breed}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                selectDogBreed(breed);
                              }}
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition hover:bg-mist ${
                                draftProfile.breed === breed ? "bg-mist font-semibold text-pine" : "text-ink"
                              }`}
                            >
                              <span>{breed}</span>
                              {draftProfile.breed === breed && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                            </button>
                          ))
                        ) : (
                          <div className="space-y-1">
                            <p className="px-3 py-2 text-sm text-muted">No listed breed matches that search.</p>
                            <button
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                selectDogBreed("Other");
                              }}
                              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold text-pine transition hover:bg-mist"
                            >
                              <span>Other</span>
                              <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {draftProfile.breed === "Other" && (
                    <div className="rounded-lg border border-pine/15 bg-mist/60 p-3">
                      <Field label="Specify" required error={showValidation ? profileErrors.customBreed : undefined}>
                        <input
                          value={draftProfile.customBreed ?? ""}
                          onChange={(event) => updateProfile("customBreed", event.target.value)}
                          disabled={!isEditing}
                          required
                          aria-invalid={Boolean(profileErrors.customBreed)}
                          placeholder="e.g. rescue mix, village dog, unknown cross"
                          className="input bg-white"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              ) : (
                <input
                  value={draftProfile.breed}
                  onChange={(event) => updateProfile("breed", event.target.value)}
                  disabled={!isEditing}
                  required
                  aria-invalid={Boolean(profileErrors.breed)}
                  placeholder="e.g. Holland Lop, cockatiel, bearded dragon"
                  className="input"
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <Field label="Birth date" required helper="Approximate if unknown." error={showValidation ? profileErrors.birthDate : undefined}>
              <input
                type="date"
                value={draftProfile.birthDate}
                onChange={(event) => updateProfile("birthDate", event.target.value)}
                disabled={!isEditing}
                required
                aria-invalid={Boolean(profileErrors.birthDate)}
                className="input"
              />
            </Field>
            <Field label="Sex" required error={showValidation ? profileErrors.sex : undefined}>
              <input
                value={draftProfile.sex}
                onChange={(event) => updateProfile("sex", event.target.value)}
                disabled={!isEditing}
                required
                aria-invalid={Boolean(profileErrors.sex)}
                placeholder="e.g. Female, neutered male, unknown"
                className="input"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <Field label="Weight" required helper="Toggle units to convert the entered weight." error={showValidation ? profileErrors.weightKg : undefined}>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formatWeightInput(draftProfile.weightKg, weightUnit)}
                  onChange={(event) => updateWeight(event.target.value)}
                  disabled={!isEditing}
                  required
                  aria-invalid={Boolean(profileErrors.weightKg)}
                  className="input min-w-0 flex-1"
                />
                <div className="inline-flex shrink-0 rounded-lg border border-ink/10 bg-ivory p-1">
                  {(["kg", "lb"] as WeightUnit[]).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setWeightUnit(unit)}
                      disabled={!isEditing}
                      className={`min-h-8 rounded-md px-3 text-xs font-semibold uppercase transition ${
                        weightUnit === unit ? "bg-pine text-white shadow-sm" : "text-muted hover:bg-white hover:text-ink disabled:hover:bg-transparent"
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
            <Field label="Microchip">
              <input
                value={draftProfile.microchip}
                onChange={(event) => updateProfile("microchip", event.target.value)}
                disabled={!isEditing}
                className="input"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <Field label="Insurance">
              <input
                value={draftProfile.insurance}
                onChange={(event) => updateProfile("insurance", event.target.value)}
                disabled={!isEditing}
                className="input"
              />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle icon={ClipboardList} title="Medical notes" />
          <SectionUpdated value={data.sectionUpdatedAt.profile} />
        </div>
        <div className="mt-5 grid gap-4">
          <Field label="Allergies">
            <textarea
              value={draftProfile.allergies.join("\n")}
              onChange={(event) => updateList("allergies", event.target.value)}
              disabled={!isEditing}
              className="input min-h-24"
            />
          </Field>
          <Field label="Conditions">
            <textarea
              value={draftProfile.conditions.join("\n")}
              onChange={(event) => updateList("conditions", event.target.value)}
              disabled={!isEditing}
              className="input min-h-24"
            />
          </Field>
          <Field label="Care instructions">
            <textarea
              value={draftProfile.careInstructions.join("\n")}
              onChange={(event) => updateList("careInstructions", event.target.value)}
              disabled={!isEditing}
              className="input min-h-28"
            />
          </Field>
        </div>
      </Panel>

      <Panel className="lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionTitle icon={Stethoscope} title="Vet contacts" />
            <div className="mt-2">
              <SectionUpdated value={data.sectionUpdatedAt.contacts} />
            </div>
          </div>
          {isEditing && <ActionButton icon={Plus} label="Add contact" onClick={addVet} variant="secondary" />}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {draftProfile.vets.map((vet) => (
            <div key={vet.id} className="rounded-lg border border-ink/10 bg-white/70 p-4">
              {isEditing && (
                <div className="mb-4 flex justify-end">
                  <ActionButton icon={Trash2} label="Delete contact" onClick={() => removeVet(vet)} variant="danger" />
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Clinic">
                  <input
                    value={vet.clinic}
                    onChange={(event) => updateVet(vet.id, "clinic", event.target.value)}
                    disabled={!isEditing}
                    className="input"
                  />
                </Field>
                <Field label="Clinician">
                  <input
                    value={vet.clinician}
                    onChange={(event) => updateVet(vet.id, "clinician", event.target.value)}
                    disabled={!isEditing}
                    className="input"
                  />
                </Field>
                <Field label="Role">
                  <input
                    value={vet.role}
                    onChange={(event) => updateVet(vet.id, "role", event.target.value)}
                    disabled={!isEditing}
                    className="input"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={vet.phone}
                    onChange={(event) => updateVet(vet.id, "phone", event.target.value)}
                    disabled={!isEditing}
                    className="input"
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={vet.email}
                    onChange={(event) => updateVet(vet.id, "email", event.target.value)}
                    disabled={!isEditing}
                    className="input"
                  />
                </Field>
                <Field label="After-hours">
                  <input
                    value={vet.afterHours ?? ""}
                    onChange={(event) => updateVet(vet.id, "afterHours", event.target.value)}
                    disabled={!isEditing}
                    className="input"
                  />
                </Field>
              </div>
              <Field label="Address">
                <input
                  value={vet.address}
                  onChange={(event) => updateVet(vet.id, "address", event.target.value)}
                  disabled={!isEditing}
                  className="input mt-1"
                />
              </Field>
            </div>
          ))}
          {draftProfile.vets.length === 0 && (
            <div className="rounded-lg border border-dashed border-ink/15 bg-ivory p-4 lg:col-span-2">
              <EmptyState text="No vet contacts in this draft. Add one before saving if you want vet details in the emergency summary." />
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function TimelineView({
  data,
  commit
}: {
  data: PetMemoryData;
  commit: (updater: (current: PetMemoryData) => PetMemoryData) => void;
}) {
  const [draft, setDraft] = useState<HealthEvent>(emptyEvent);

  const submit = () => {
    if (!draft.title.trim() || !draft.detail.trim()) return;
    commit((current) => ({
      ...current,
      events: [{ ...draft, id: newId("evt") }, ...current.events]
    }));
    setDraft(emptyEvent());
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <Panel>
        <SectionTitle icon={Plus} title="Add health event" />
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select
                value={draft.type}
                onChange={(event) => setDraft({ ...draft, type: event.target.value as EventType })}
                className="input"
              >
                {Object.entries(eventLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date and time">
              <input type="datetime-local" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="input" />
            </Field>
          </div>
          <Field label="Title">
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="input" />
          </Field>
          <Field label="Details">
            <textarea value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} className="input min-h-28" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Source">
              <input value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} className="input" />
            </Field>
            <Field label="Body area">
              <input value={draft.bodyArea ?? ""} onChange={(event) => setDraft({ ...draft, bodyArea: event.target.value })} className="input" />
            </Field>
          </div>
          <Field label="Severity">
            <input
              type="range"
              min="1"
              max="5"
              value={draft.severity ?? 2}
              onChange={(event) => setDraft({ ...draft, severity: Number(event.target.value) })}
              className="w-full accent-pine"
            />
            <Severity value={draft.severity ?? 2} />
          </Field>
          <ActionButton icon={Plus} label="Save event" onClick={submit} />
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel>
          <SectionTitle icon={NotebookTabs} title="Health timeline" />
          <div className="mt-5 space-y-3">
            {[...data.events].sort(sortByDateDesc("date")).map((event) => (
              <TimelineItem key={event.id} event={event} />
            ))}
            {data.events.length === 0 && (
              <GuidedEmptyState
                icon={NotebookTabs}
                title="The health timeline starts here"
                description="Add the first vet visit, symptom, behavior change, test result, or care note using the form beside this panel."
              />
            )}
          </div>
        </Panel>
        <DocumentsUpload data={data} commit={commit} />
      </div>
    </div>
  );
}

function MedicationView({
  data,
  commit,
  registerUndo
}: {
  data: PetMemoryData;
  commit: CommitPetMemory;
  registerUndo: RegisterUndo;
}) {
  const [draft, setDraft] = useState<Medication>(emptyMedication);
  const [isMedicationListEditing, setIsMedicationListEditing] = useState(false);
  const [selectedMedicationId, setSelectedMedicationId] = useState<string | null>(null);
  const [showAddMedicationForm, setShowAddMedicationForm] = useState(false);
  const medicationSortTime = (medication: Medication) => {
    const timestamp = new Date(medication.endDate || medication.startDate).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };
  const sortMedicationByDateDesc = (a: Medication, b: Medication) => medicationSortTime(b) - medicationSortTime(a);
  const currentMedications = [...data.medications]
    .filter((medication) => medication.status !== "Ended")
    .sort(sortMedicationByDateDesc);
  const endedMedications = [...data.medications]
    .filter((medication) => medication.status === "Ended")
    .sort(sortMedicationByDateDesc);

  const resetMedicationForm = () => {
    setDraft(emptyMedication());
  };

  const openAddMedicationForm = () => {
    setIsMedicationListEditing(false);
    setSelectedMedicationId(null);
    setShowAddMedicationForm(true);
  };

  const closeAddMedicationForm = () => {
    resetMedicationForm();
    setShowAddMedicationForm(false);
  };

  const submit = () => {
    if (!draft.name.trim() || !draft.dosage.trim()) return;
    commit(
      (current) => ({
        ...current,
        medications: [{ ...draft, id: newId("med") }, ...current.medications]
      }),
      "medications"
    );
    resetMedicationForm();
    setShowAddMedicationForm(false);
  };

  const updateMedication = <K extends keyof Medication>(id: string, field: K, value: Medication[K]) => {
    commit(
      (current) => ({
        ...current,
        medications: current.medications.map((medication) => (medication.id === id ? { ...medication, [field]: value } : medication))
      }),
      "medications"
    );
  };

  const deleteMedication = (medication: Medication) => {
    if (!window.confirm(`Are you sure you want to delete ${medication.name}? This removes it from this pet's medication tracker.`)) return;
    const removedIndex = data.medications.findIndex((item) => item.id === medication.id);
    commit(
      (current) => ({
        ...current,
        medications: current.medications.filter((item) => item.id !== medication.id)
      }),
      "medications"
    );
    registerUndo(`${medication.name} was removed.`, () => {
      commit(
        (current) => {
          if (current.medications.some((item) => item.id === medication.id)) return current;
          const medications = [...current.medications];
          medications.splice(Math.max(0, Math.min(removedIndex, medications.length)), 0, medication);
          return { ...current, medications };
        },
        "medications",
        data.id
      );
    });
    if (selectedMedicationId === medication.id) {
      setSelectedMedicationId(null);
    }
  };

  const toggleMedicationListEditing = () => {
    if (isMedicationListEditing) {
      setSelectedMedicationId(null);
    }
    setIsMedicationListEditing((current) => !current);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionTitle icon={ClipboardList} title="Medication tracker" />
            <div className="mt-2">
              <SectionUpdated value={data.sectionUpdatedAt.medications} />
            </div>
            {isMedicationListEditing && (
              <p className="mt-3 text-sm leading-6 text-muted">
                Choose a medication to edit. Changes save automatically. Use X only for mistakes.
              </p>
            )}
          </div>
          <ActionButton
            icon={isMedicationListEditing ? CheckCircle2 : Pencil}
            label={isMedicationListEditing ? "Done" : "Edit list"}
            onClick={toggleMedicationListEditing}
            variant="secondary"
          />
        </div>
        <div className="mt-5 space-y-6">
          {data.medications.length === 0 && (
            <GuidedEmptyState
              icon={Pill}
              title="No medications recorded"
              description="Add current medicines, supplements, or a recently ended course so dosage and vet notes stay easy to find."
            />
          )}

          {currentMedications.length > 0 && (
            <MedicationGroup
              title="Active medications"
              medications={currentMedications}
              isEditing={isMedicationListEditing}
              selectedMedicationId={selectedMedicationId}
              onSelect={setSelectedMedicationId}
              onUpdate={updateMedication}
              onDelete={deleteMedication}
            />
          )}

          {endedMedications.length > 0 && (
            <MedicationGroup
              title="Ended medications"
              medications={endedMedications}
              isEditing={isMedicationListEditing}
              selectedMedicationId={selectedMedicationId}
              onSelect={setSelectedMedicationId}
              onUpdate={updateMedication}
              onDelete={deleteMedication}
            />
          )}

          <div className="border-t border-ink/10 pt-5">
            {showAddMedicationForm ? (
              <div className="rounded-lg border border-pine/20 bg-mist/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <SectionTitle icon={Pill} title="Add medication" />
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Add a new medication to this pet's tracker.
                    </p>
                  </div>
                  <ActionButton icon={X} label="Cancel" onClick={closeAddMedicationForm} variant="secondary" />
                </div>
                <div className="mt-5 grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Medication">
                      <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="input" />
                    </Field>
                    <Field label="Dosage">
                      <input value={draft.dosage} onChange={(event) => setDraft({ ...draft, dosage: event.target.value })} className="input" />
                    </Field>
                  </div>
                  <Field label="Frequency">
                    <input value={draft.frequency} onChange={(event) => setDraft({ ...draft, frequency: event.target.value })} className="input" />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Start">
                      <input
                        type="date"
                        value={draft.startDate}
                        onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="End">
                      <input
                        type="date"
                        value={draft.endDate ?? ""}
                        onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Status">
                      <select
                        value={draft.status}
                        onChange={(event) => setDraft({ ...draft, status: event.target.value as Medication["status"] })}
                        className="input"
                      >
                        <option>Active</option>
                        <option>Paused</option>
                        <option>Ended</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Refill notes">
                    <textarea
                      value={draft.refillNotes}
                      onChange={(event) => setDraft({ ...draft, refillNotes: event.target.value })}
                      className="input min-h-20"
                    />
                  </Field>
                  <Field label="Vet note">
                    <textarea
                      value={draft.vetNote ?? ""}
                      onChange={(event) => setDraft({ ...draft, vetNote: event.target.value })}
                      className="input min-h-20"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton icon={Plus} label="Save medication" onClick={submit} />
                    <ActionButton icon={X} label="Cancel" onClick={closeAddMedicationForm} variant="secondary" />
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={openAddMedicationForm}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-pine/15 bg-mist px-4 py-2 text-sm font-semibold text-pine transition hover:border-pine/35 hover:bg-sage/30"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add medication
              </button>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function MedicationGroup({
  title,
  medications,
  isEditing,
  selectedMedicationId,
  onSelect,
  onUpdate,
  onDelete
}: {
  title: string;
  medications: Medication[];
  isEditing: boolean;
  selectedMedicationId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: <K extends keyof Medication>(id: string, field: K, value: Medication[K]) => void;
  onDelete: (medication: Medication) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-normal text-muted">{title}</h3>
        <span className="rounded-lg bg-oat px-2 py-1 text-xs font-semibold text-muted">{medications.length}</span>
      </div>
      <div className="grid gap-3">
        {medications.map((medication) => {
          const selected = selectedMedicationId === medication.id;
          return (
            <article
              key={medication.id}
              className={`rounded-lg border bg-white/75 p-4 transition ${
                selected ? "border-pine bg-mist/70 shadow-soft" : isEditing ? "border-pine/20 bg-white" : "border-ink/10"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-ink">{medication.name}</h4>
                    <StatusPill label={medication.status} />
                    {selected && <span className="rounded-lg bg-pine px-2 py-1 text-xs font-semibold text-white">Editing</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {medication.dosage} · {medication.frequency}
                  </p>
                </div>
                <div className="flex shrink-0 items-start justify-between gap-2 sm:justify-end">
                  <p className="text-sm font-medium text-muted">
                    {formatDate(medication.startDate)} {medication.endDate ? `to ${formatDate(medication.endDate)}` : ""}
                  </p>
                  {isEditing && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => onSelect(selected ? null : medication.id)}
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                          selected
                            ? "border-pine bg-pine text-white"
                            : "border-ink/10 bg-white text-ink hover:border-pine/40 hover:bg-mist"
                        }`}
                        aria-label={selected ? `Close ${medication.name} editor` : `Edit ${medication.name}`}
                        title={selected ? `Close ${medication.name} editor` : `Edit ${medication.name}`}
                      >
                        {selected ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(medication);
                        }}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-coral/20 bg-coral/10 text-coral transition hover:border-coral hover:bg-coral hover:text-white"
                        aria-label={`Delete ${medication.name}`}
                        title={`Delete ${medication.name}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                {selected ? (
                  <>
                    <Field label="Medication">
                      <input
                        value={medication.name}
                        onChange={(event) => onUpdate(medication.id, "name", event.target.value)}
                        className="input"
                      />
                    </Field>
                    <Field label="Dosage">
                      <input
                        value={medication.dosage}
                        onChange={(event) => onUpdate(medication.id, "dosage", event.target.value)}
                        className="input"
                      />
                    </Field>
                    <Field label="Frequency">
                      <input
                        value={medication.frequency}
                        onChange={(event) => onUpdate(medication.id, "frequency", event.target.value)}
                        className="input"
                      />
                    </Field>
                    <Field label="Status">
                      <select
                        value={medication.status}
                        onChange={(event) => onUpdate(medication.id, "status", event.target.value as Medication["status"])}
                        className="input"
                      >
                        <option>Active</option>
                        <option>Paused</option>
                        <option>Ended</option>
                      </select>
                    </Field>
                    <Field label="Start">
                      <input
                        type="date"
                        value={medication.startDate}
                        onChange={(event) => onUpdate(medication.id, "startDate", event.target.value)}
                        className="input"
                      />
                    </Field>
                    <Field label="End">
                      <input
                        type="date"
                        value={medication.endDate ?? ""}
                        onChange={(event) => onUpdate(medication.id, "endDate", event.target.value || undefined)}
                        className="input"
                      />
                    </Field>
                    <Field label="Refill notes">
                      <textarea
                        value={medication.refillNotes}
                        onChange={(event) => onUpdate(medication.id, "refillNotes", event.target.value)}
                        className="input min-h-20"
                      />
                    </Field>
                    <Field label="Vet note">
                      <textarea
                        value={medication.vetNote ?? ""}
                        onChange={(event) => onUpdate(medication.id, "vetNote", event.target.value)}
                        className="input min-h-20"
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Definition label="Refill" value={medication.refillNotes || "Not set"} />
                    <Definition label="Vet note" value={medication.vetNote || "Not set"} />
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SymptomView({
  data,
  commit
}: {
  data: PetMemoryData;
  commit: (updater: (current: PetMemoryData) => PetMemoryData) => void;
}) {
  const [draft, setDraft] = useState<SymptomLog>(emptySymptom);

  const submit = () => {
    if (!draft.name.trim() || !draft.notes.trim()) return;
    const symptom: SymptomLog = { ...draft, id: newId("sym") };
    const event: HealthEvent = {
      id: newId("evt"),
      type: "symptom",
      date: draft.dateTime,
      title: draft.name,
      detail: draft.notes,
      source: "Owner symptom log",
      severity: draft.severity,
      bodyArea: draft.bodyArea,
      files: draft.files
    };
    commit((current) => ({
      ...current,
      symptoms: [symptom, ...current.symptoms],
      events: [event, ...current.events]
    }));
    setDraft(emptySymptom());
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <Panel>
        <SectionTitle icon={HeartPulse} title="Log symptom" />
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Symptom">
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="input" />
            </Field>
            <Field label="Body area">
              <input value={draft.bodyArea} onChange={(event) => setDraft({ ...draft, bodyArea: event.target.value })} className="input" />
            </Field>
          </div>
          <Field label="Date and time">
            <input type="datetime-local" value={draft.dateTime} onChange={(event) => setDraft({ ...draft, dateTime: event.target.value })} className="input" />
          </Field>
          <Field label="Severity">
            <input
              type="range"
              min="1"
              max="5"
              value={draft.severity}
              onChange={(event) => setDraft({ ...draft, severity: Number(event.target.value) })}
              className="w-full accent-coral"
            />
            <Severity value={draft.severity} />
          </Field>
          <Field label="Notes">
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="input min-h-28" />
          </Field>
          <Field label="Photo or file names">
            <input
              value={draft.files.join(", ")}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  files: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                })
              }
              placeholder="limp-video.mov, paw-photo.jpg"
              className="input"
            />
          </Field>
          <ActionButton icon={Plus} label="Save symptom" onClick={submit} />
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={ClipboardList} title="Symptom log" />
        <div className="mt-5 grid gap-3">
          {[...data.symptoms].sort(sortByDateDesc("dateTime")).map((symptom) => (
            <div key={symptom.id} className="rounded-lg border border-ink/10 bg-white/75 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-ink">{symptom.name}</h3>
                  <p className="mt-1 text-sm text-muted">{symptom.bodyArea || "No body area set"}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-muted">{formatDate(symptom.dateTime, true)}</p>
                  <Severity value={symptom.severity} compact />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink">{symptom.notes}</p>
              {symptom.files.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {symptom.files.map((file) => (
                    <span key={file} className="rounded-lg border border-ink/10 bg-oat px-2 py-1 text-xs font-medium text-muted">
                      {file}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {data.symptoms.length === 0 && (
            <GuidedEmptyState
              icon={HeartPulse}
              title="No symptoms logged"
              description="When something changes, record what you noticed, where, how severe it seemed, and when it happened."
            />
          )}
        </div>
      </Panel>
    </div>
  );
}

function ExpenseView({
  data,
  commit
}: {
  data: PetMemoryData;
  commit: (updater: (current: PetMemoryData) => PetMemoryData) => void;
}) {
  const [draft, setDraft] = useState<Expense>(emptyExpense);

  const submit = () => {
    if (!draft.vendor.trim() || draft.amount <= 0) return;
    commit((current) => ({
      ...current,
      expenses: [{ ...draft, id: newId("exp") }, ...current.expenses]
    }));
    setDraft(emptyExpense());
  };

  const totalByCategory = categories.map((category) => ({
    label: category,
    value: data.expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0),
    color: categoryTone[category]
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <Panel>
        <SectionTitle icon={BadgeDollarSign} title="Add expense" />
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date">
              <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="input" />
            </Field>
            <Field label="Category">
              <select
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value as ExpenseCategory })}
                className="input"
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Vendor">
            <input value={draft.vendor} onChange={(event) => setDraft({ ...draft, vendor: event.target.value })} className="input" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount">
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.amount || ""}
                onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}
                className="input"
              />
            </Field>
            <Field label="Note">
              <input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} className="input" />
            </Field>
          </div>
          <ActionButton icon={Plus} label="Save expense" onClick={submit} />
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel>
          <SectionTitle icon={LineChart} title="Costs by category" />
          {data.expenses.length > 0 ? (
            <BarChart items={totalByCategory} currencyValues />
          ) : (
            <div className="mt-5">
              <GuidedEmptyState
                icon={BadgeDollarSign}
                title="No care costs recorded"
                description="Add the first invoice, medicine, food, insurance, physio, or emergency cost to begin seeing spending patterns."
              />
            </div>
          )}
        </Panel>
        <Panel>
          <SectionTitle icon={ClipboardList} title="Expense ledger" />
          {data.expenses.length > 0 ? (
          <div className="mt-5 overflow-hidden rounded-lg border border-ink/10">
            <table className="w-full border-collapse bg-white/80 text-sm">
              <thead className="bg-mist text-left text-xs uppercase tracking-normal text-muted">
                <tr>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Vendor</th>
                  <th className="px-3 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...data.expenses].sort(sortByDateDesc("date")).map((expense) => (
                  <tr key={expense.id} className="border-t border-ink/10">
                    <td className="px-3 py-3 text-muted">{formatDate(expense.date)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-lg bg-oat px-2 py-1 text-xs font-semibold text-ink">{expense.category}</span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-ink">{expense.vendor}</p>
                      <p className="mt-1 text-xs text-muted">{expense.note}</p>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-ink">{currency(expense.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-muted">Saved costs will appear here in date order with their category and provider.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function TrendsView({
  data,
  metrics,
  commit
}: {
  data: PetMemoryData;
  metrics: ReturnType<typeof buildMetrics>;
  commit: (updater: (current: PetMemoryData) => PetMemoryData) => void;
}) {
  const [weight, setWeight] = useState<WeightPoint>(() => emptyWeight(data.profile.weightKg));

  const submitWeight = () => {
    if (!weight.date || weight.kg <= 0) return;
    commit((current) => ({
      ...current,
      profile: { ...current.profile, weightKg: weight.kg },
      weights: [...current.weights, weight].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }));
    setWeight(emptyWeight(weight.kg));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel className="lg:col-span-2">
        <SectionTitle icon={LineChart} title="Weight over time" />
        <WeightChart points={data.weights} />
      </Panel>
      <Panel>
        <SectionTitle icon={Plus} title="Add weight" />
        <div className="mt-5 grid gap-4">
          <Field label="Date">
            <input type="date" value={weight.date} onChange={(event) => setWeight({ ...weight, date: event.target.value })} className="input" />
          </Field>
          <Field label="Weight kg">
            <input
              type="number"
              step="0.1"
              value={weight.kg}
              onChange={(event) => setWeight({ ...weight, kg: Number(event.target.value) })}
              className="input"
            />
          </Field>
          <ActionButton icon={Plus} label="Save weight" onClick={submitWeight} />
        </div>
      </Panel>
      <Panel>
        <SectionTitle icon={HeartPulse} title="Symptom frequency" />
        <BarChart items={metrics.symptomFrequency} />
      </Panel>
      <Panel className="lg:col-span-2">
        <SectionTitle icon={BadgeDollarSign} title="Monthly costs" />
        <BarChart items={metrics.monthlyCosts} currencyValues />
      </Panel>
    </div>
  );
}

function LongevityView({
  data,
  metrics,
  commit
}: {
  data: PetMemoryData;
  metrics: ReturnType<typeof buildMetrics>;
  commit: (updater: (current: PetMemoryData) => PetMemoryData) => void;
}) {
  const [preventionDraft, setPreventionDraft] = useState<PreventionItem>(emptyPrevention);
  const [routineDraft, setRoutineDraft] = useState<HabitRoutine>(emptyRoutine);
  const vetPrepQuestions = useMemo(() => buildVetPrepQuestions(data), [data]);
  const today = todayInput();

  const updatePrevention = (id: string, patch: Partial<PreventionItem>) => {
    commit((current) => ({
      ...current,
      longevity: {
        ...current.longevity,
        prevention: current.longevity.prevention.map((item) => (item.id === id ? { ...item, ...patch } : item))
      }
    }));
  };

  const updateWatchItem = (id: string, patch: Partial<RiskWatchItem>) => {
    commit((current) => ({
      ...current,
      longevity: {
        ...current.longevity,
        watchlist: current.longevity.watchlist.map((item) => (item.id === id ? { ...item, ...patch } : item))
      }
    }));
  };

  const toggleRoutineToday = (routine: HabitRoutine) => {
    const hasToday = routine.completionDates.includes(today);
    const completionDates = hasToday
      ? routine.completionDates.filter((date) => date !== today)
      : [...routine.completionDates, today].sort();

    commit((current) => ({
      ...current,
      longevity: {
        ...current.longevity,
        routines: current.longevity.routines.map((item) => (item.id === routine.id ? { ...item, completionDates } : item))
      }
    }));
  };

  const submitPrevention = () => {
    if (!preventionDraft.title.trim()) return;
    commit((current) => ({
      ...current,
      longevity: {
        ...current.longevity,
        prevention: [{ ...preventionDraft, id: newId("prev") }, ...current.longevity.prevention]
      }
    }));
    setPreventionDraft(emptyPrevention());
  };

  const submitRoutine = () => {
    if (!routineDraft.title.trim()) return;
    commit((current) => ({
      ...current,
      longevity: {
        ...current.longevity,
        routines: [{ ...routineDraft, id: newId("routine") }, ...current.longevity.routines]
      }
    }));
    setRoutineDraft(emptyRoutine());
  };

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <SectionTitle icon={ShieldCheck} title="Longevity support layer" />
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              A secondary tracker for staying on top of preventive care, daily routines, and patterns worth discussing with your vet.
            </p>
          </div>
          <MedicalNote />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Prevention attention" value={metrics.preventionAttentionCount} icon={ListChecks} tone="text-amber" />
          <Metric label="7-day routines" value={`${metrics.routineCompletionRate}%`} icon={Activity} tone="text-pine" />
          <Metric label="Watch items" value={metrics.watchlistAttentionCount} icon={Target} tone="text-coral" />
          <Metric label="Latest QoL" value={`${metrics.latestQualityScore}/5`} icon={HeartPulse} tone="text-lilac" />
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionTitle icon={ListChecks} title="Prevention checklist" />
          <p className="mt-3 text-sm leading-6 text-muted">
            Keep the boring-but-important care items visible: vaccines, dental, parasites, labs, weight, mobility, nutrition, and admin.
          </p>
          <div className="mt-5 space-y-3">
            {data.longevity.prevention.length ? (
              data.longevity.prevention.map((item) => (
                <div key={item.id} className="rounded-lg border border-ink/10 bg-white/75 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">{item.title}</h3>
                        <span className="rounded-lg bg-oat px-2 py-1 text-xs font-semibold text-muted">{item.category}</span>
                      </div>
                      {item.lastDoneDate && <p className="mt-1 text-xs font-medium text-muted">Last done {formatDate(item.lastDoneDate)}</p>}
                    </div>
                    <select
                      value={item.status}
                      onChange={(event) =>
                        updatePrevention(item.id, {
                          status: event.target.value as PreventionStatus,
                          lastDoneDate: event.target.value === "Done" ? today : item.lastDoneDate
                        })
                      }
                      className={`input md:w-44 ${preventionStatusTone(item.status)}`}
                    >
                      {preventionStatuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[0.65fr_1.35fr]">
                    <Field label="Next due">
                      <input
                        type="date"
                        value={item.nextDueDate ?? ""}
                        onChange={(event) => updatePrevention(item.id, { nextDueDate: event.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Notes">
                      <input
                        value={item.notes}
                        onChange={(event) => updatePrevention(item.id, { notes: event.target.value })}
                        className="input"
                      />
                    </Field>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No prevention items yet. Add vaccines, dental care, parasite prevention, bloodwork, or custom items." />
            )}
          </div>

          <div className="mt-5 rounded-lg border border-dashed border-ink/20 bg-white/60 p-4">
            <h3 className="text-sm font-semibold text-ink">Add custom checklist item</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Item">
                <input
                  value={preventionDraft.title}
                  onChange={(event) => setPreventionDraft({ ...preventionDraft, title: event.target.value })}
                  placeholder="e.g. Recheck stairs/rugs setup"
                  className="input"
                />
              </Field>
              <Field label="Category">
                <select
                  value={preventionDraft.category}
                  onChange={(event) => setPreventionDraft({ ...preventionDraft, category: event.target.value as PreventionCategory })}
                  className="input"
                >
                  {preventionCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={preventionDraft.status}
                  onChange={(event) => setPreventionDraft({ ...preventionDraft, status: event.target.value as PreventionStatus })}
                  className="input"
                >
                  {preventionStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </Field>
              <Field label="Next due">
                <input
                  type="date"
                  value={preventionDraft.nextDueDate ?? ""}
                  onChange={(event) => setPreventionDraft({ ...preventionDraft, nextDueDate: event.target.value })}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Notes">
              <input
                value={preventionDraft.notes}
                onChange={(event) => setPreventionDraft({ ...preventionDraft, notes: event.target.value })}
                className="input mt-1"
              />
            </Field>
            <div className="mt-3">
              <ActionButton icon={Plus} label="Add checklist item" onClick={submitPrevention} variant="secondary" />
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={Activity} title="Daily and weekly habits" />
          <p className="mt-3 text-sm leading-6 text-muted">
            Track routines that support better care conversations: activity, physio, medication adherence, grooming, rest, enrichment, and appetite.
          </p>
          <div className="mt-5 space-y-3">
            {data.longevity.routines.length ? (
              data.longevity.routines.map((routine) => {
                const stats = getRoutineStats(routine);
                const completedToday = routine.completionDates.includes(today);
                return (
                  <div key={routine.id} className="rounded-lg border border-ink/10 bg-white/75 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-ink">{routine.title}</h3>
                          <span className="rounded-lg bg-mist px-2 py-1 text-xs font-semibold text-pine">{routine.category}</span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-muted">
                          {routine.cadence} · target {routine.targetPerWeek}/week · streak {stats.streak}d
                        </p>
                      </div>
                      <ActionButton
                        icon={CheckCircle2}
                        label={completedToday ? "Done today" : "Mark today"}
                        onClick={() => toggleRoutineToday(routine)}
                        variant={completedToday ? "primary" : "secondary"}
                      />
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-muted">Last 7 days</span>
                        <span className="font-semibold text-ink">{stats.rate}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-lg bg-ink/10">
                        <div className="h-full rounded-lg bg-pine" style={{ width: `${Math.max(5, stats.rate)}%` }} />
                      </div>
                    </div>
                    {routine.notes && <p className="mt-3 text-sm leading-6 text-muted">{routine.notes}</p>}
                  </div>
                );
              })
            ) : (
              <EmptyState text="No routines yet. Add a walking, physio, supplement, grooming, sleep, enrichment, or appetite routine." />
            )}
          </div>

          <div className="mt-5 rounded-lg border border-dashed border-ink/20 bg-white/60 p-4">
            <h3 className="text-sm font-semibold text-ink">Add custom routine</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Routine">
                <input
                  value={routineDraft.title}
                  onChange={(event) => setRoutineDraft({ ...routineDraft, title: event.target.value })}
                  placeholder="e.g. Evening sniff walk"
                  className="input"
                />
              </Field>
              <Field label="Category">
                <select
                  value={routineDraft.category}
                  onChange={(event) => setRoutineDraft({ ...routineDraft, category: event.target.value as RoutineCategory })}
                  className="input"
                >
                  {routineCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cadence">
                <select
                  value={routineDraft.cadence}
                  onChange={(event) => setRoutineDraft({ ...routineDraft, cadence: event.target.value as RoutineCadence })}
                  className="input"
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                </select>
              </Field>
              <Field label="Target per week">
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={routineDraft.targetPerWeek}
                  onChange={(event) => setRoutineDraft({ ...routineDraft, targetPerWeek: Number(event.target.value) })}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Notes">
              <input
                value={routineDraft.notes}
                onChange={(event) => setRoutineDraft({ ...routineDraft, notes: event.target.value })}
                className="input mt-1"
              />
            </Field>
            <div className="mt-3">
              <ActionButton icon={Plus} label="Add routine" onClick={submitRoutine} variant="secondary" />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle icon={Target} title="Risk watchlist" />
            <MedicalNote compact />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            Things to monitor and discuss with your vet. These are observations, not diagnoses.
          </p>
          <div className="mt-5 space-y-3">
            {data.longevity.watchlist.length ? (
              data.longevity.watchlist.map((item) => (
                <div key={item.id} className="rounded-lg border border-ink/10 bg-white/75 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{item.watch}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">{item.whyItMatters}</p>
                    </div>
                    <div className="min-w-32">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-normal text-muted">Severity</p>
                      <Severity value={item.severity} compact />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[0.7fr_1.3fr]">
                    <Field label="Last observed">
                      <input
                        value={item.lastObserved}
                        onChange={(event) => updateWatchItem(item.id, { lastObserved: event.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Notes">
                      <input
                        value={item.notes}
                        onChange={(event) => updateWatchItem(item.id, { notes: event.target.value })}
                        className="input"
                      />
                    </Field>
                  </div>
                  <Field label="Severity">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={item.severity}
                      onChange={(event) => updateWatchItem(item.id, { severity: Number(event.target.value) })}
                      className="w-full accent-coral"
                    />
                  </Field>
                </div>
              ))
            ) : (
              <EmptyState text="No watch items yet. Add things like limping, appetite changes, coughing, skin irritation, or medication side effects." />
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={MessageSquareText} title="Vet conversation prep" />
          <p className="mt-3 text-sm leading-6 text-muted">
            A deterministic question list based on recent events, overdue prevention items, and watchlist items. Review it with your veterinarian or physio.
          </p>
          <div className="mt-5 rounded-lg border border-pine/20 bg-mist/70 p-4">
            <h3 className="text-sm font-semibold text-ink">Questions to bring up</h3>
            {vetPrepQuestions.length ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink">
                {vetPrepQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            ) : (
              <EmptyState text="No prep questions yet. Add timeline events, prevention due dates, or watchlist items to generate discussion prompts." />
            )}
            <p className="mt-4 text-xs font-semibold uppercase tracking-normal text-coral">Not medical advice</p>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">Routine completion</h3>
              <BarChart items={metrics.routineCompletionItems} valueSuffix="%" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Quality-of-life notes</h3>
              <div className="mt-5 space-y-3">
                {data.longevity.qualityOfLifeNotes.length ? (
                  [...data.longevity.qualityOfLifeNotes]
                    .sort(sortByDateDesc("date"))
                    .slice(0, 3)
                    .map((note) => (
                      <div key={note.id} className="rounded-lg border border-ink/10 bg-white/75 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">{formatDate(note.date)}</p>
                          <p className="text-xs font-semibold uppercase tracking-normal text-muted">
                            Avg {qualityScore(note)}/5
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-5 text-muted">{note.notes}</p>
                      </div>
                    ))
                ) : (
                  <EmptyState text="No quality-of-life notes yet." />
                )}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle icon={LineChart} title="Longevity trends" />
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Weight trend</h3>
            <WeightChart points={data.weights} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Symptom frequency</h3>
            <BarChart items={metrics.symptomFrequency} />
            <h3 className="mt-6 text-sm font-semibold text-ink">Monthly care cost</h3>
            <BarChart items={metrics.monthlyCosts} currencyValues />
          </div>
        </div>
      </Panel>
    </div>
  );
}

function RecentView({ data }: { data: PetMemoryData }) {
  const [range, setRange] = useState<TimeRange>(30);
  const [summary, setSummary] = useState<SummaryResponse>(() => makeLocalSummary(data, 30));
  const [allowAi, setAllowAi] = useState(false);
  const [summaryNotice, setSummaryNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const changes = useMemo(() => getRecentChanges(data, range), [data, range]);

  useEffect(() => {
    setSummary(makeLocalSummary(data, range));
    setSummaryNotice("");
  }, [data, range]);

  const refreshSummary = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      if (allowAi && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
      }

      const response = await fetch("/api/summary", {
        method: "POST",
        headers,
        body: JSON.stringify({ data: buildSummaryRequestData(data), rangeDays: range, allowAi })
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorBody?.error ?? "Summary request failed");
      }
      setSummary((await response.json()) as SummaryResponse);
      setSummaryNotice("");
    } catch (error) {
      setSummary(makeLocalSummary(data, range));
      setSummaryNotice(error instanceof Error ? error.message : "Showing the local summary instead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionTitle icon={Sparkles} title="What changed recently?" />
          <div className="flex rounded-lg border border-ink/10 bg-white p-1">
            {([7, 30, 90] as TimeRange[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  range === item ? "bg-pine text-white" : "text-muted hover:bg-oat"
                }`}
              >
                {item}d
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Events" value={changes.events.length} icon={NotebookTabs} tone="text-pine" />
          <Metric label="Symptoms" value={changes.symptoms.length} icon={HeartPulse} tone="text-coral" />
          <Metric label="Costs" value={currency(changes.expenseTotal)} icon={BadgeDollarSign} tone="text-amber" />
        </div>
        <div className="mt-5 rounded-lg border border-pine/20 bg-mist/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-ink">Care summary</h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-normal text-muted">
                {summary.mode === "ai" ? "AI-assisted observations" : "Local observations"}
              </p>
            </div>
            <ActionButton icon={Sparkles} label={loading ? "Summarizing" : "Refresh"} onClick={refreshSummary} variant="secondary" />
          </div>
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-ink/10 bg-white/65 p-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={allowAi}
              onChange={(event) => setAllowAi(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-ink/20 accent-pine"
            />
            <span>
              <span className="block font-semibold">Use AI summary when signed in</span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Not medical advice. Sends a minimized recent-care summary to the AI provider only after you check this box.
              </span>
            </span>
          </label>
          {summaryNotice && <p className="mt-3 rounded-lg bg-oat px-3 py-2 text-xs font-medium text-muted">{summaryNotice}</p>}
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{summary.summary}</p>
          <div className="mt-4 border-t border-pine/20 pt-4">
            <h4 className="text-sm font-semibold text-ink">Questions for the vet</h4>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
              {summary.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            These are notes and questions, not a diagnosis or treatment plan.
          </p>
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={CalendarClock} title={`Last ${range} days`} />
        <div className="mt-5 space-y-4">
          <ChangeGroup title="Health events" items={changes.events.map((event) => `${formatDate(event.date, true)}: ${event.title}`)} />
          <ChangeGroup title="Symptoms" items={changes.symptoms.map((symptom) => `${formatDate(symptom.dateTime, true)}: ${symptom.name}, severity ${symptom.severity}/5`)} />
          <ChangeGroup title="Documents" items={changes.documents.map((document) => `${formatDate(document.date)}: ${document.title}`)} />
          <ChangeGroup title="Open reminders" items={changes.reminders.map((reminder) => `${formatDate(reminder.dueDate, true)}: ${reminder.title}`)} />
        </div>
      </Panel>
    </div>
  );
}

function EmergencyView({ data }: { data: PetMemoryData }) {
  const recentEvents = [...data.events].sort(sortByDateDesc("date")).slice(0, 6);
  const activeMeds = data.medications.filter((med) => med.status === "Active");

  return (
    <div className="emergency-sheet rounded-lg border border-ink/20 bg-white p-5 shadow-sm sm:p-8">
      <div className="no-print mb-5 flex flex-wrap items-center justify-end gap-2">
        <ActionButton icon={Printer} label="Print or save PDF" onClick={() => window.print()} />
        <ActionButton icon={Download} label="Export HTML" onClick={() => downloadEmergencyHtml(data)} variant="secondary" />
      </div>

      <div className="flex flex-col gap-4 border-b-2 border-ink pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-coral">Emergency veterinary summary</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-normal text-ink">{data.profile.name}</h2>
          <p className="mt-2 text-sm text-muted">
            {displaySpecies(data.profile)} · {displayBreed(data.profile)} · {getAge(data.profile.birthDate)} · {data.profile.sex || "Sex not set"} · {formatWeightKg(data.profile.weightKg)}
          </p>
        </div>
        <dl className="grid gap-2 text-sm sm:min-w-72">
          <Definition label="Microchip" value={data.profile.microchip} />
          <Definition label="Insurance" value={data.profile.insurance} />
          <Definition label="Summary current through" value={formatDate(data.updatedAt, true)} />
        </dl>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <EmergencyBlock title="Allergies" items={data.profile.allergies} urgent />
        <EmergencyBlock title="Known conditions" items={data.profile.conditions} />
        <EmergencyBlock title="Current medications" items={activeMeds.map((med) => `${med.name}: ${med.dosage}, ${med.frequency}`)} />
        <EmergencyBlock title="Care instructions" items={data.profile.careInstructions} />
      </div>

      <section className="avoid-break mt-6">
        <h3 className="text-base font-semibold text-ink">Vet contacts</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {data.profile.vets.map((vet) => (
            <div key={vet.id} className="rounded-lg border border-ink/10 p-4">
              <h4 className="font-semibold text-ink">{vet.clinic}</h4>
              <p className="mt-1 text-sm text-muted">
                {vet.clinician} · {vet.role}
              </p>
              <p className="mt-2 text-sm text-ink">{vet.phone}</p>
              <p className="text-sm text-muted">{vet.email}</p>
              <p className="text-sm text-muted">{vet.address}</p>
              {vet.afterHours && <p className="mt-2 text-sm font-semibold text-coral">After-hours: {vet.afterHours}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="avoid-break mt-6">
        <h3 className="text-base font-semibold text-ink">Recent events</h3>
        <div className="mt-3 space-y-3">
          {recentEvents.map((event) => (
            <div key={event.id} className="rounded-lg border border-ink/10 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h4 className="font-semibold text-ink">{event.title}</h4>
                <p className="text-sm font-medium text-muted">{formatDate(event.date, true)}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink">{event.detail}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-normal text-muted">{event.source}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="avoid-break mt-6">
        <h3 className="text-base font-semibold text-ink">Documents on file</h3>
        <div className="mt-3 grid gap-2 text-sm">
          {data.documents.map((document) => (
            <div key={document.id} className="flex flex-col gap-1 rounded-lg border border-ink/10 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium text-ink">{document.title}</span>
              <span className="text-muted">
                {document.type} · {formatDate(document.date)} · {document.fileName ?? "No file name"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DocumentsUpload({
  data,
  commit
}: {
  data: PetMemoryData;
  commit: (updater: (current: PetMemoryData) => PetMemoryData) => void;
}) {
  const addDocuments = (files: FileList | null) => {
    if (!files?.length) return;
    const documents: VetDocument[] = Array.from(files).map((file) => ({
      id: newId("doc"),
      title: file.name.replace(/\.[^.]+$/, ""),
      date: todayInput(),
      type: "Other",
      source: "Local attachment placeholder",
      fileName: file.name,
      notes: "File metadata saved locally. Connect storage before storing medical files in production."
    }));
    commit((current) => ({ ...current, documents: [...documents, ...current.documents] }));
  };

  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle icon={FileText} title="Vet documents" />
        <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-pine bg-pine px-3 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Attach files
          <input className="sr-only" type="file" multiple onChange={(event) => addDocuments(event.target.files)} />
        </label>
      </div>
      <div className="mt-5 grid gap-3">
        {data.documents.map((document) => (
          <div key={document.id} className="rounded-lg border border-ink/10 bg-white/75 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-ink">{document.title}</h3>
                <p className="mt-1 text-sm text-muted">
                  {document.type} · {document.source}
                </p>
              </div>
              <span className="text-sm font-medium text-muted">{formatDate(document.date)}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink">{document.notes}</p>
            {document.fileName && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-oat px-2 py-1 text-xs font-medium text-muted">
                <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
                {document.fileName}
              </p>
            )}
          </div>
        ))}
        {data.documents.length === 0 && (
          <GuidedEmptyState
            icon={FileText}
            title="No vet documents attached"
            description="Attach a lab result, invoice, discharge note, scan, or photo reference so it stays connected to this pet&apos;s history."
          />
        )}
      </div>
    </Panel>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-ink/10 bg-white/85 p-5 shadow-soft backdrop-blur ${className}`}>{children}</section>;
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist text-pine">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold tracking-normal text-ink">{title}</h2>
    </div>
  );
}

function TodayCard({
  label,
  value,
  detail,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-ivory/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
      </div>
      <p className="mt-3 text-base font-semibold leading-6 text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-normal text-ink">{value}</p>
    </div>
  );
}

function InfoBlock({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${danger ? "border-coral/15 bg-coral/5" : "border-ink/10 bg-white/60"}`}>
      <h3 className={`text-sm font-semibold ${danger ? "text-coral" : "text-ink"}`}>{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted">None recorded yet.</p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  required = false,
  helper,
  error
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  helper?: string;
  error?: string;
}) {
  return (
    <div className="grid gap-1 text-sm font-medium text-ink">
      <span>
        {label}
        {required && <span className="ml-1 text-coral" aria-hidden="true">*</span>}
      </span>
      {children}
      {helper && <span className="text-xs font-normal leading-5 text-muted">{helper}</span>}
      {error && <span className="text-xs font-semibold leading-5 text-coral">{error}</span>}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "primary",
  disabled = false
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const className =
    variant === "primary"
      ? "border-pine bg-pine text-white shadow-soft hover:bg-ink"
      : variant === "danger"
        ? "border-coral/25 bg-coral/10 text-coral hover:border-coral hover:bg-coral hover:text-white"
        : "border-ink/10 bg-white text-ink hover:border-pine/40 hover:bg-mist";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function StatusPill({ label }: { label: string }) {
  const tone = label === "Active" ? "bg-pine text-white" : label === "Paused" ? "bg-amber/20 text-amber" : "bg-oat text-muted";
  return <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function TimelineItem({ event }: { event: HealthEvent }) {
  return (
    <article className={`rounded-lg border border-l-4 border-ink/10 bg-white/85 p-4 shadow-sm ${eventAccent[event.type]}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${eventTone[event.type]}`}>
              {eventLabels[event.type]}
            </span>
            {event.severity ? <Severity value={event.severity} compact /> : null}
          </div>
          <h3 className="mt-2 text-base font-semibold text-ink">{event.title}</h3>
        </div>
        <p className="text-sm font-medium text-muted">{formatDate(event.date, true)}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink">{event.detail}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted">
        <span>{event.source}</span>
        {event.bodyArea && <span>Body area: {event.bodyArea}</span>}
        {event.related && <span>Related: {event.related}</span>}
      </div>
      {event.files && event.files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {event.files.map((file) => (
            <span key={file} className="rounded-lg border border-ink/10 bg-oat px-2 py-1 text-xs font-medium text-muted">
              {file}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function ReminderRow({
  reminder,
  commit
}: {
  reminder: Reminder;
  commit: (updater: (current: PetMemoryData) => PetMemoryData) => void;
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/75 p-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() =>
            commit((current) => ({
              ...current,
              reminders: current.reminders.map((item) => (item.id === reminder.id ? { ...item, done: !item.done } : item))
            }))
          }
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
            reminder.done ? "border-pine bg-pine text-white" : "border-ink/20 bg-white text-muted"
          }`}
          aria-label={reminder.done ? "Mark reminder open" : "Mark reminder done"}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <div>
          <p className={`text-sm font-semibold ${reminder.done ? "text-muted line-through" : "text-ink"}`}>{reminder.title}</p>
          <p className="mt-1 text-xs font-medium text-muted">
            {reminder.type} · {formatDate(reminder.dueDate, true)}
          </p>
          {reminder.notes && <p className="mt-2 text-sm leading-5 text-muted">{reminder.notes}</p>}
        </div>
      </div>
    </div>
  );
}

function Definition({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-normal text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function Severity({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-1 ${compact ? "mt-0" : "mt-2"}`} aria-label={`Severity ${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={`h-2 rounded-full ${compact ? "w-2" : "w-7"} ${index < value ? "bg-coral" : "bg-ink/10"}`}
        />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-ink/20 bg-white/60 p-4 text-sm text-muted">{text}</p>;
}

function MedicalNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-coral/30 bg-coral/5 ${compact ? "px-3 py-2" : "p-3"}`}>
      <p className="text-xs font-semibold uppercase tracking-normal text-coral">Not medical advice</p>
      {!compact && (
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
          Use these observations to support better care conversations with a veterinarian.
        </p>
      )}
    </div>
  );
}

function ChangeGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">Nothing logged.</p>
      )}
    </div>
  );
}

function EmergencyBlock({ title, items, urgent = false }: { title: string; items: string[]; urgent?: boolean }) {
  return (
    <section className={`avoid-break rounded-lg border p-4 ${urgent ? "border-coral bg-coral/5" : "border-ink/20 bg-white"}`}>
      <h3 className={`text-base font-semibold ${urgent ? "text-coral" : "text-ink"}`}>{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function WeightChart({ points }: { points: WeightPoint[] }) {
  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const values = sorted.map((point) => point.kg);
  const min = Math.min(...values) - 0.2;
  const max = Math.max(...values) + 0.2;
  const width = 620;
  const height = 220;
  const chartPoints = sorted.map((point, index) => {
    const x = sorted.length === 1 ? width / 2 : (index / (sorted.length - 1)) * width;
    const y = height - ((point.kg - min) / (max - min || 1)) * (height - 24) - 12;
    return { ...point, x, y };
  });
  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="mt-5 rounded-lg border border-ink/10 bg-white/70 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-60 w-full" role="img" aria-label="Weight trend chart">
        <line x1="0" y1={height - 20} x2={width} y2={height - 20} stroke="#d7dce2" strokeWidth="1" />
        <polyline points={polyline} fill="none" stroke="#245247" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        {chartPoints.map((point) => (
          <g key={`${point.date}-${point.kg}`}>
            <circle cx={point.x} cy={point.y} r="6" fill="#d86f57" stroke="#ffffff" strokeWidth="3" />
            <text x={point.x} y={point.y - 14} textAnchor="middle" className="fill-muted text-[12px] font-semibold">
              {point.kg.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-medium text-muted">
        {sorted.map((point) => (
          <span key={point.date}>{formatDate(point.date)}</span>
        ))}
      </div>
    </div>
  );
}

function BarChart({
  items,
  currencyValues = false,
  valueSuffix = ""
}: {
  items: Array<{ label: string; value: number; color?: string }>;
  currencyValues?: boolean;
  valueSuffix?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="mt-5 space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{item.label}</span>
            <span className="font-semibold text-muted">{currencyValues ? currency(item.value) : `${item.value}${valueSuffix}`}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-lg bg-ink/10">
            <div className={`h-full rounded-lg ${item.color ?? "bg-pine"}`} style={{ width: `${Math.max(5, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function syncStatusLabel(status: SyncStatus) {
  const labels: Record<SyncStatus, string> = {
    local: "Local only",
    checking: "Checking",
    "signed-out": "Signed out",
    "loading-cloud": "Loading sync",
    saving: "Saving",
    synced: "Synced",
    conflict: "Review sync",
    error: "Sync issue"
  };
  return labels[status];
}

function syncStatusTone(status: SyncStatus) {
  if (status === "synced") return "bg-pine text-white";
  if (status === "saving" || status === "checking" || status === "loading-cloud") return "bg-amber/20 text-amber";
  if (status === "conflict") return "bg-amber/20 text-amber";
  if (status === "error") return "bg-coral/10 text-coral";
  return "bg-oat text-muted";
}

async function savePetMemoryToCloud(userId: string, data: AppMemoryData) {
  if (!supabase) return "Supabase is not configured.";

  const activePet = data.pets.find((pet) => pet.id === data.activePetId) ?? data.pets[0];
  const { error } = await supabase.from("pet_memories").upsert(
    {
      user_id: userId,
      title: activePet ? `${activePet.profile.name || "Primary pet"} household` : "Pet household",
      data,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  return error?.message ?? null;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocalhost) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
    return;
  }

  if (window.location.protocol !== "https:") return;

  navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}

function preventionStatusTone(status: PreventionStatus) {
  if (status === "Done") return "border-pine/30 bg-pine/10 text-pine";
  if (status === "Due soon") return "border-amber/30 bg-amber/10 text-amber";
  if (status === "Overdue") return "border-coral/30 bg-coral/10 text-coral";
  return "border-ink/10 bg-oat text-muted";
}

function getRoutineStats(routine: HabitRoutine) {
  const recentDates = lastNDays(7);
  const completed = recentDates.filter((date) => routine.completionDates.includes(date)).length;
  const target = Math.max(1, Math.min(7, routine.targetPerWeek));
  return {
    completed,
    rate: Math.min(100, Math.round((completed / target) * 100)),
    streak: getCompletionStreak(routine.completionDates)
  };
}

function getCompletionStreak(completionDates: string[]) {
  const completed = new Set(completionDates);
  let streak = 0;
  for (const date of lastNDays(30)) {
    if (!completed.has(date)) break;
    streak += 1;
  }
  return streak;
}

function qualityScore(note: { mobility: number; appetite: number; mood: number; comfort: number }) {
  return Number(((note.mobility + note.appetite + note.mood + note.comfort) / 4).toFixed(1));
}

function lastNDays(days: number) {
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return toDateKey(date);
  });
}

function toDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function buildMetrics(data: PetMemoryData) {
  const now = new Date();
  const last30 = daysAgo(30, now);
  const activeMedicationCount = data.medications.filter((med) => med.status === "Active").length;
  const costLast30 = data.expenses.filter((expense) => new Date(expense.date) >= last30).reduce((sum, expense) => sum + expense.amount, 0);
  const symptomsLast30 = data.symptoms.filter((symptom) => new Date(symptom.dateTime) >= last30).length;
  const openReminderCount = data.reminders.filter((reminder) => !reminder.done).length;
  const symptomFrequency = Object.entries(
    data.symptoms.reduce<Record<string, number>>((acc, symptom) => {
      acc[symptom.name] = (acc[symptom.name] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value, color: "bg-coral" }));

  const monthlyCosts = Object.entries(
    data.expenses.reduce<Record<string, number>>((acc, expense) => {
      const month = expense.date.slice(0, 7);
      acc[month] = (acc[month] ?? 0) + expense.amount;
      return acc;
    }, {})
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value, color: "bg-pine" }));

  const routineStats = data.longevity.routines.map((routine) => ({
    routine,
    stats: getRoutineStats(routine)
  }));
  const routineCompletionRate = routineStats.length
    ? Math.round(routineStats.reduce((sum, item) => sum + item.stats.rate, 0) / routineStats.length)
    : 0;
  const routineCompletionItems = routineStats.map(({ routine, stats }) => ({
    label: routine.title,
    value: stats.rate,
    color: stats.rate >= 80 ? "bg-pine" : stats.rate >= 50 ? "bg-amber" : "bg-coral"
  }));
  const preventionAttentionCount = data.longevity.prevention.filter((item) => item.status === "Due soon" || item.status === "Overdue").length;
  const watchlistAttentionCount = data.longevity.watchlist.filter((item) => item.severity >= 3).length;
  const latestQuality = [...data.longevity.qualityOfLifeNotes].sort(sortByDateDesc("date"))[0];
  const latestQualityScore = latestQuality ? qualityScore(latestQuality) : 0;

  return {
    activeMedicationCount,
    costLast30,
    symptomsLast30,
    openReminderCount,
    symptomFrequency,
    monthlyCosts,
    preventionAttentionCount,
    routineCompletionRate,
    routineCompletionItems,
    watchlistAttentionCount,
    latestQualityScore
  };
}

function getRecentChanges(data: PetMemoryData, days: TimeRange) {
  const cutoff = daysAgo(days);
  cutoff.setHours(0, 0, 0, 0);
  const events = data.events.filter((item) => new Date(item.date) >= cutoff).sort(sortByDateDesc("date"));
  const symptoms = data.symptoms.filter((item) => new Date(item.dateTime) >= cutoff).sort(sortByDateDesc("dateTime"));
  const expenses = data.expenses.filter((item) => new Date(item.date) >= cutoff).sort(sortByDateDesc("date"));
  const documents = data.documents.filter((item) => new Date(item.date) >= cutoff).sort(sortByDateDesc("date"));
  const reminders = data.reminders.filter((item) => !item.done && new Date(item.dueDate) >= cutoff).sort(sortByDateDesc("dueDate"));

  return {
    events,
    symptoms,
    expenses,
    documents,
    reminders,
    expenseTotal: expenses.reduce((sum, expense) => sum + expense.amount, 0)
  };
}

function buildVetPrepQuestions(data: PetMemoryData) {
  const recentEvents = data.events.filter((event) => new Date(event.date) >= daysAgo(30)).sort(sortByDateDesc("date"));
  const overduePrevention = data.longevity.prevention.filter((item) => item.status === "Overdue");
  const dueSoonPrevention = data.longevity.prevention.filter((item) => item.status === "Due soon");
  const watchItems = data.longevity.watchlist.filter((item) => item.severity >= 3).sort((a, b) => b.severity - a.severity);
  const questions: string[] = [];

  if (recentEvents[0]) {
    questions.push(`Can we review the recent "${recentEvents[0].title}" event and confirm what I should monitor next?`);
  }

  if (recentEvents.some((event) => event.type === "symptom")) {
    questions.push("Do the recent symptom logs suggest any changes to what I should track at home?");
  }

  if (overduePrevention.length) {
    questions.push(`Which overdue preventive item should I prioritize first: ${overduePrevention.map((item) => item.title).join(", ")}?`);
  }

  if (dueSoonPrevention.length) {
    questions.push(`Can we plan timing for upcoming preventive care: ${dueSoonPrevention.slice(0, 3).map((item) => item.title).join(", ")}?`);
  }

  if (watchItems[0]) {
    questions.push(`For "${watchItems[0].watch}", what changes would make you want me to call sooner?`);
  }

  if (data.medications.some((medication) => medication.status === "Active")) {
    questions.push("Are there medication or supplement side effects I should keep logging between visits?");
  }

  if (data.longevity.routines.some((routine) => getRoutineStats(routine).rate < 60)) {
    questions.push("Are the current routines realistic, or should the care plan be simplified for better consistency?");
  }

  questions.push("Is there anything in the timeline, prevention checklist, or watchlist that would change the next follow-up plan?");

  return Array.from(new Set(questions)).slice(0, 8);
}

function makeLocalSummary(data: PetMemoryData, rangeDays: TimeRange): SummaryResponse {
  const changes = getRecentChanges(data, rangeDays);
  const topSymptoms = changes.symptoms.map((symptom) => `${symptom.name} (${symptom.severity}/5)`).slice(0, 3);
  const summaryLines = [
    `${data.profile.name} has ${changes.events.length} health events, ${changes.symptoms.length} symptom logs, and ${currency(changes.expenseTotal)} in care expenses in the last ${rangeDays} days.`,
    topSymptoms.length
      ? `Most notable symptoms logged: ${topSymptoms.join(", ")}.`
      : "No symptoms were logged in this range.",
    changes.events[0] ? `Most recent event: ${changes.events[0].title} on ${formatDate(changes.events[0].date)}.` : "No recent health events were logged."
  ];

  return {
    mode: "local",
    summary: summaryLines.join("\n"),
    questions: [
      "Do the recent symptom patterns change the current monitoring plan?",
      "Are any medication side effects worth watching more closely?",
      "Should activity, physio, diet, or follow-up timing be adjusted?"
    ]
  };
}

function buildSummaryRequestData(data: PetMemoryData) {
  return {
    profile: {
      name: data.profile.name,
      species: displaySpecies(data.profile),
      breed: displayBreed(data.profile),
      birthDate: data.profile.birthDate,
      conditions: data.profile.conditions,
      allergies: data.profile.allergies
    },
    events: data.events.map((event) => ({
      type: event.type,
      date: event.date,
      title: event.title,
      detail: event.detail,
      severity: event.severity,
      bodyArea: event.bodyArea
    })),
    symptoms: data.symptoms.map((symptom) => ({
      name: symptom.name,
      severity: symptom.severity,
      bodyArea: symptom.bodyArea,
      dateTime: symptom.dateTime,
      notes: symptom.notes
    })),
    expenses: data.expenses.map((expense) => ({
      date: expense.date,
      category: expense.category,
      amount: expense.amount,
      note: expense.note
    })),
    medications: data.medications.map((medication) => ({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      status: medication.status
    }))
  };
}

function downloadJson(data: AppMemoryData) {
  if (
    !window.confirm(
      "Export the full household JSON backup?\n\nThis file includes private pet health notes, vet contacts, medications, microchip/insurance fields, expenses, and reminders. Store or share it carefully."
    )
  ) {
    return;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, "pet-health-memory-household.json");
}

function downloadEmergencyHtml(data: PetMemoryData) {
  if (
    !window.confirm(
      "Export this emergency summary as an HTML file?\n\nIt may include allergies, conditions, active medications, vet contacts, and recent health events. Share it only with people who should see this pet's care details."
    )
  ) {
    return;
  }

  const activeMeds = data.medications
    .filter((med) => med.status === "Active")
    .map((med) => `<li>${escapeHtml(`${med.name}: ${med.dosage}, ${med.frequency}`)}</li>`)
    .join("");
  const recent = [...data.events]
    .sort(sortByDateDesc("date"))
    .slice(0, 6)
    .map((event) => `<li><strong>${escapeHtml(formatDate(event.date, true))}</strong>: ${escapeHtml(event.title)}. ${escapeHtml(event.detail)}</li>`)
    .join("");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.profile.name)} emergency summary</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1d2433; margin: 32px; line-height: 1.5; }
    h1, h2 { margin-bottom: 8px; }
    section { margin-top: 22px; border-top: 1px solid #d7dce2; padding-top: 16px; }
    .urgent { color: #b84f3d; font-weight: 700; }
  </style>
</head>
<body>
  <p class="urgent">Emergency veterinary summary</p>
  <h1>${escapeHtml(data.profile.name)}</h1>
  <p>${escapeHtml(`${displaySpecies(data.profile)} · ${displayBreed(data.profile)} · ${getAge(data.profile.birthDate)} · ${formatWeightKg(data.profile.weightKg)}`)}</p>
  <section><h2>Allergies</h2><ul>${data.profile.allergies.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
  <section><h2>Conditions</h2><ul>${data.profile.conditions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
  <section><h2>Active medications</h2><ul>${activeMeds || "<li>None listed</li>"}</ul></section>
  <section><h2>Vet contacts</h2>${data.profile.vets
    .map(
      (vet) =>
        `<p><strong>${escapeHtml(vet.clinic)}</strong><br>${escapeHtml(vet.clinician)} · ${escapeHtml(vet.role)}<br>${escapeHtml(vet.phone)}<br>${escapeHtml(vet.email)}<br>${escapeHtml(vet.address)}${
          vet.afterHours ? `<br><strong>After-hours:</strong> ${escapeHtml(vet.afterHours)}` : ""
        }</p>`
    )
    .join("")}</section>
  <section><h2>Recent events</h2><ul>${recent}</ul></section>
</body>
</html>`;
  downloadBlob(new Blob([html], { type: "text/html" }), `${safeDownloadName(data.profile.name || "pet")}-emergency-summary.html`);
}

function safeDownloadName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "pet"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sortByDateDesc<T extends Record<K, string>, K extends keyof T>(key: K) {
  return (a: T, b: T) => new Date(b[key]).getTime() - new Date(a[key]).getTime();
}

function daysAgo(days: number, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return date;
}

function formatDate(value: string, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {})
  }).format(date);
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function displaySpecies(profile: PetProfile) {
  const detail = profile.customSpecies?.trim();
  return detail || profile.species;
}

function displayBreed(profile: PetProfile) {
  if (profile.species === "Dog" && profile.breed === "Other") {
    return profile.customBreed?.trim() || "Other not specified";
  }
  return profile.breed || "Type not set";
}

function getAge(birthDate: string) {
  const birth = new Date(birthDate);
  if (!birthDate || Number.isNaN(birth.getTime())) return "Age not set";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years -= 1;
  return `${years} years old`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
