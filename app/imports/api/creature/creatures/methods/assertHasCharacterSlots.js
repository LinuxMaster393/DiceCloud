import { getUserTier } from '/imports/api/users/patreon/tiers';
import Creatures from '/imports/api/creature/creatures/Creatures';
import ArchiveCreatureFiles from '/imports/api/creature/archive/ArchiveCreatureFiles';

export default function assertHasCharactersSlots(userId) {
  if (characterSlotsRemaining(userId) <= 0) {
    throw new Meteor.Error('characterSlotLimit',
      'No character slots left')
  }
}

export function characterSlotsRemaining(userId) {
  let tier = getUserTier(userId);
  const currentCharacterCount = Creatures.find({
    owner: userId,
  }, {
    fields: { _id: 1 },
  }).count() + ArchiveCreatureFiles.find({
    userId,
    'meta.auto': true,
  }, {
    fields: { _id: 1 },
  }).count();
  if (tier.characterSlots === -1) {
    return Number.POSITIVE_INFINITY;
  }
  return tier.characterSlots - currentCharacterCount;
}
