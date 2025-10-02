export function randomID(length=16) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const cutoff = 0x100000000 - (0x100000000 % chars.length);
    const random = new Uint32Array(length);
    do {
        crypto.getRandomValues(random);
    } while ( random.some(x => x >= cutoff) );
    let id = "";
    for ( let i = 0; i < length; i++ ) id += chars[random[i] % chars.length];
    return id;
}

console.log(randomID(16));
