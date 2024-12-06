import { CoolWord } from "./interfaces";

const coolWords: CoolWord = {
    "nouns": "space",
    "art": "crafty",
    "flumplen": "fidgetify",
    "casterful": "nounwave",
    "cloud": "iverse",
    "beach": "sand",
    "space": "rocket",
    "book": "fidget",
    "nounce": "gnars",
    "castle": "noun"
};

export function generateRandomImageName(): string {
    const randomName: string[] = [];
    for (let i = 0; i < 4; i++) {
        const randomKey: string = Object.keys(coolWords)[Math.floor(Math.random() * Object.keys(coolWords).length)];
        randomName.push(coolWords[randomKey]);
    }
    return `${randomName[0]}-${randomName[1]}-${randomName[2]}-${randomName[3]}`;
}
