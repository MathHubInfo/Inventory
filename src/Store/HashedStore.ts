import { EventEmitter } from 'events';

export abstract class HashedStoreBackend<O, N, H> {
    abstract async fetchObjectHash(n: N): Promise<H | undefined>;
    abstract async fetchObject(n: N): Promise<O>;
    abstract async fetchObjectNames(): Promise<N[]>;
    abstract getObjectHash(o: O): H | undefined;
}

export default class HashedStore<O, N, H> {
    constructor(public backend: HashedStoreBackend<O, N, H>) {}


    // # region "Object Storage"
    
    private store = new Map<N, O>();

    /**
     * Refreshes and then returns the current list of objects
     * 
     * Rejects iff it can not fetch the current list of objects
     * and otherwise ignores single-element failures silently
     */
    async getObjects(): Promise<O[]> {
        // get all of the names
        let names;
        try {
            names = await this.backend.fetchObjectNames();

        // getting names failed
        // assuming this is a temporary error
        // and keep the cache
        } catch (e) {
            this.emit(HashedStore.EVENT_ERROR_FETCH_NAMES, e);
            throw e;
        }
        
        // delete the keys that no longer exist
        for (const name of this.store.keys()) {
            if (!names.includes(name)){
                this.deleteObject(name);
            }
        }

        // and fetch all the objects
        const objects = await Promise.all<O | undefined>(names.map(async (m) => {
            try {
                return this.getObject(m);
            } catch(e) {
                return undefined;
            }
        }));

        // and return the defined objects
        return objects.filter((o): o is O => o !== undefined);
    }

    /** gets all current objects without checking if they are up-to-date */
    getObjectsSync(): O[] {
        return Array.from(this.store.values());
    }

    /**
     * deletes all objects in the cached
     * (optionally only those subject to a predicate)
     */
    deleteObjects(predicate?: (entry: [N, O]) => boolean) {
        for (const entry of this.store.entries()) {
            if (!predicate || predicate(entry)) {
                this.deleteObject(entry[0]);
            }
        }
    }
    
    /**
     * Gets an object from the store
     * Throws an error iff it can not find an object
     * @param name 
     */
    async getObject(name: N): Promise<O> {
        const current = this.store.get(name);

        // if we have the element from before
        // fetch it's current hash 
        if (current !== undefined) {
            let newHash: H | undefined;
            try {
                newHash = await this.backend.fetchObjectHash(name);

            // getting the new hash failed
            } catch(e) {
                this.emit(HashedStore.EVENT_ERROR_FETCH_HASH, e, name);
                newHash = undefined;
            }

            // get the hash we have in the cache
            let oldHash: H | undefined;
            try {
                oldHash = this.backend.getObjectHash(current);
            
            // getting the hash of the stored object failed
            } catch(e) {
                this.emit(HashedStore.EVENT_ERROR_GET_HASH, e, current);
                oldHash = undefined;
            }

            // if we have an old hash and a new hash
            // and they match, we can return the object as is
            if (oldHash !== undefined && newHash !== undefined && oldHash === newHash) {
                this.emit(HashedStore.CACHE_HIT, name, newHash);
                return current;

            // else we missed the cache and need to update
            } else {
                this.emit(HashedStore.CACHE_MISS, name, oldHash, newHash);
            }
        }

        // get the (new) object
        let obj;
        try {
            obj = await this.backend.fetchObject(name);

        // if we failed, delete the object, as it might simply no longer exist
        } catch(e) {
            this.deleteObject(name);
            throw e;
        }

        // save the current object in the store
        this.store.set(name, obj);  
        if (current) {
            this.emit(HashedStore.EVENT_UPDATE, name, current, obj);
        } else {
            this.emit(HashedStore.EVENT_ADD, name, obj);
        }

        // and return the object
        return obj;
    }

    /** gets an object without doing any updates */
    getObjectSync(n: N): O | undefined {
        return this.store.get(n);
    }

    /** removes an object from this store, return true iff it existed */
    deleteObject(name: N): boolean {
        if (this.store.delete(name)) {
            this.emit(HashedStore.EVENT_DELETE, name);
            return true;
        }
        return false;
    }

    // #endregion


    // #region "Event Handling"
    private emitter = new EventEmitter();

    static readonly EVENT_ADD = 'add';
    static readonly CACHE_HIT = 'cacheHit'; // name, hash
    static readonly CACHE_MISS = 'cacheMiss'; // name, oldHash, newHash
    static readonly EVENT_UPDATE = 'update'; // name, oldObject, newObject
    static readonly EVENT_DELETE = 'delete'; // name

    static readonly EVENT_ERROR_FETCH_NAMES = 'errorNames'; // e
    static readonly EVENT_ERROR_FETCH_OBJECT = 'errorFetchObject'; // e, name
    static readonly EVENT_ERROR_FETCH_HASH = 'errorFetchObjectHash';
    static readonly EVENT_ERROR_GET_HASH = 'errorGetHash'; // e, object
    
    on(event: string, handler: (...args) => void): void {
        this.emitter.on(event, handler);
    }
    once(event: string, handler: (...args) => void): void {
        this.emitter.once(event, handler);
    }
    off(event: string, handler: (...args) => void): void {
        this.emitter.off(event, handler);
    }
    private emit(event: string, ...args): void {
        // run the emit task whenever you have time for it
        // but not now
        setImmediate(() => {
            try {
                this.emitter.emit(event, ...args);
            } catch(e) {}
        });
    }
    // #endregion
}