import GroupBackend from "./Store/GroupStore";

async function main() {
    const backend = new GroupBackend("https://gl.mathhub.info");
    const results = await backend.fetchObjectNames();
    console.log(results);
}

main();