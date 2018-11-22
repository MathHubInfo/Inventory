import { HashedStoreBackend } from "./HashedStore";
import { Group } from "../objects";
import GitLab from "gitlab";

class GroupBackend extends HashedStoreBackend<Group, string, string> {
    constructor(private url: string) {
        super();
        this.gitlab = new GitLab({ url });
    }
    private gitlab: GitLab;

    // object hashing
    async fetchObjectHash(n: string): Promise<string | undefined> {
        return undefined;
    }
    getObjectHash(o: Group): string | undefined {
        return undefined;
    }


    // object fetching
    async fetchObjectNames(): Promise<string[]> {
        const all = await this.gitlab.Groups.all({ maxPages: 10, perPage: 100 });
        return all.map(x => x.path);
    }

    // and fetch a group
    async fetchObject(n: string): Promise<Group> {
        throw new Error("can not fetch object");
    };
}

export default GroupBackend;