import SimpleSchema from 'simpl-schema';
import ArchiveCreatureFiles from '/imports/api/creature/archive/ArchiveCreatureFiles';
import { ArchiveCreatureFilesCollection } from '/imports/api/creature/archive/ArchiveCreatureFiles';

let schema = new SimpleSchema({
  archiveId: {
    type: String,
    max: 32,
  },
});

Meteor.publish('singleArchive', function (archiveId) {
  const self = this;
  try {
    schema.validate({ archiveId });
  } catch (e) {
    return;
  }
  this.autorun(function (computation) {
    let userId = this.userId;
    let archiveData = ArchiveCreatureFiles.find({
      _id: archiveId,
      userId,
    });
    return [archiveData.cursor];
  });
});
