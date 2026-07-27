import type { Character } from './types';

export const unknownCharacters = new Set<string>();

function extractCharacterName(topicName: string): string | null {
  const match = topicName.match(/^(.+)捏脸$/);
  return match ? match[1] : null;
}

function matchCharacter(name: string, characters: Character[]): Character | null {
  const normalizedName = name.toLowerCase().trim();

  for (const character of characters) {
    if (character.names.zh === name) return character;
    if (
      character.aliases?.some(
        (alias) => alias === name || name.includes(alias) || alias.includes(name)
      )
    ) return character;
    if (character.names.zh && name.includes(character.names.zh)) return character;
    if (character.names.zh && character.names.zh.includes(name)) return character;
    if (character.names.en.toLowerCase() === normalizedName) return character;

    const topicName = character.topicTag?.replace('捏脸', '');
    if (topicName && (topicName === name || name.includes(topicName) || topicName.includes(name))) {
      return character;
    }
  }

  return null;
}

export function detectCharacter(
  topics: FeedTopics,
  text: string,
  characters: Character[]
): { id: string; name: string } {
  const foundIds = new Set<string>();

  const names = [
    ...(topics ?? []).map((topic) => extractCharacterName(topic.topicName)).filter(Boolean),
    ...((text.match(/#([^#]+捏脸)#/g) ?? []).map((tag) => tag.replace(/#/g, '').replace('捏脸', ''))),
  ] as string[];

  for (const name of names) {
    const character = matchCharacter(name, characters);
    if (character && character.id !== 'diverse') foundIds.add(character.id);
    else if (!character) unknownCharacters.add(name);
  }

  if (foundIds.size !== 1) return { id: 'diverse', name: 'Diverse' };
  const id = [...foundIds][0];
  const character = characters.find((item) => item.id === id);
  return character ? { id, name: character.names.en } : { id: 'diverse', name: 'Diverse' };
}

type FeedTopics = { topicName: string }[] | undefined;
