/**
 * A specific version of an archive in the database
 */
export interface ArchiveVersion {
    // the ID of the archive in question
    archiveID: string;

    // the name of this version
    refName?: string;

    // the commit hash of this version, used mainly for caching purposes
    commitHash: string;

    // relational information between this archive and other objects
    relational: {
        // what this archive is tagged as
        tags: string[],
        // what this archive depends on
        dependency: string[],
    };

    // TODO: Other information from the meta-inf
    // that is transparent to the server
    meta: {}
}



/**
 * An archive
 */
export interface Archive {
    // id of this archive
    archiveID: string;

    // the time this archive was last updated
    // used for caching
    lastUpdate: string;

    // the group this archive is in
    groupID: string;

    // a list of known refs of this archive
    refs: string[]
}

export interface Group {
    // id of this group
    groupID: string;

    // the ids of archives contained in this group
    archives: string[];
}