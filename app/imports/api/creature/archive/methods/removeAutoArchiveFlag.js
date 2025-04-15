import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { RateLimiterMixin } from 'ddp-rate-limiter-mixin';
import ArchiveCreatureFiles from '/imports/api/creature/archive/ArchiveCreatureFiles';
import { assertOwnership } from '/imports/api/creature/creatures/creaturePermissions';

export const removeAutoFlag = Meteor.wrapAsync(function removeAutoFlagFn(archiveId, userId, callback) {
  ArchiveCreatureFiles.update(
    { _id: archiveId, userId },
    { $unset: { 'meta.auto': '' } },
    (error, fileRef) => {
      if (error) {
        callback(error);
      } else {
        callback();
      }
    },
  );
});

const removeAutoArchiveFlag = new ValidatedMethod({
  name: 'Creatures.methods.removeAutoArchiveFlag',
  validate: new SimpleSchema({
    'archiveId': {
      type: String,
      max: 32,
    },
  }).validator(),
  mixins: [RateLimiterMixin],
  rateLimit: {
    numRequests: 10,
    timeInterval: 5000,
  },
  async run({ archiveId }) {
    if (!this.userId || typeof this.userId !== 'string') {
      throw new Meteor.Error('Permission denied',
        'No user ID. Are you logged in?');
    }
    if (Meteor.isServer) {
      removeAutoFlag(archiveId, this.userId);
    }
  }
});

export default removeAutoArchiveFlag;
