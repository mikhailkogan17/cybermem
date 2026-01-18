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
}
