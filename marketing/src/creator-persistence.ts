import type { CreatorProfile, SampleKit } from "./creator-collaboration";

export interface CreatorPersistence {
  loadCreators(): Promise<CreatorProfile[]>;
  saveCreator(creator: CreatorProfile): Promise<void>;
  loadSampleKits(): Promise<SampleKit[]>;
  saveSampleKit(kit: SampleKit): Promise<void>;
}

export type MarketingCreatorPersistence = CreatorPersistence;
