declare module "openmemory-js" {
  export interface MemoryOptions {
    user_id?: string;
    tags?: string[];
    [key: string]: any;
  }

  export interface SearchOptions {
    user_id?: string;
    limit?: number;
    sectors?: string[];
  }

  export class Memory {
    constructor(user_id?: string);
    add(content: string, opts?: MemoryOptions): Promise<any>;
    get(id: string): Promise<any>;
    search(query: string, opts?: SearchOptions): Promise<any[]>;
    delete_all(user_id?: string): Promise<void>;
    wipe(): Promise<void>;
    source(name: string): any;
  }

  export function update_memory(
    id: string,
    content?: string,
    tags?: string[],
    metadata?: any,
  ): Promise<{ id: string; updated: boolean }>;

  export function reinforce_memory(id: string, boost?: number): Promise<void>;
}

declare module "openmemory-js/dist/core/memory.js" {
  import { Memory } from "openmemory-js";
  export { Memory };
}

declare module "openmemory-js/dist/memory/hsg.js" {
  export function update_memory(
    id: string,
    content?: string,
    tags?: string[],
    metadata?: any,
  ): Promise<{ id: string; updated: boolean }>;

  export function reinforce_memory(id: string, boost?: number): Promise<void>;
}
