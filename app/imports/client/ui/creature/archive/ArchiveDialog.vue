<template lang="html">
  <dialog-base>
    <template #toolbar>
      <v-toolbar-title>
        {{ mode === 'archive' ? 'Archive' : 'Restore' }}
      </v-toolbar-title>
      <v-spacer />
      <v-btn-toggle
        v-model="mode"
        mandatory
      >
        <v-btn value="archive">
          <span>Archive</span>
          <v-icon right>
            mdi-archive-arrow-down
          </v-icon>
        </v-btn>
        <v-btn value="restore">
          <span>Restore</span>
          <v-icon right>
            mdi-archive-arrow-up-outline
          </v-icon>
        </v-btn>
      </v-btn-toggle>
    </template>
    <creature-folder-list
      selection
      :creatures="mode === 'archive' ? CreaturesWithNoParty : archiveCreaturesWithNoParty"
      :folders="mode === 'archive' ? folders : archivefolders"
      :selected-creature="!!selectedCreature ? selectedCreature._id : null"
      @creature-selected="creature => selectedCreature = creature"
    />
    <v-spacer slot="actions" />
    <v-btn
      slot="actions"
      text
      :loading="archiveActionLoading"
      :disabled="!numSelected || (mode === 'restore' && characterSlots <= 0)"
      color="primary"
      @click="archiveAction"
    >
      <template v-if="mode === 'restore' && characterSlots <= 0">
        No Character Slots Left
      </template>
      <template v-else>
        {{ mode === 'archive' ? 'Archive' : 'Restore' }}
      </template>
    </v-btn>
    <v-btn
      slot="actions"
      text
      @click="$store.dispatch('popDialogStack')"
    >
      Close
    </v-btn>
  </dialog-base>
</template>

<script lang="js">
import DialogBase from '/imports/client/ui/dialogStack/DialogBase.vue';
import Creatures from '/imports/api/creature/creatures/Creatures';
import CreatureFolders from '/imports/api/creature/creatureFolders/CreatureFolders';
import CreatureFolderList from '/imports/client/ui/creature/creatureList/CreatureFolderList.vue';
import ArchiveCreatureFiles from '/imports/api/creature/archive/ArchiveCreatureFiles';
import archiveCreatureToFile from '/imports/api/creature/archive/methods/archiveCreatureToFile';
import restoreCreatureFromFile from '/imports/api/creature/archive/methods/restoreCreatureFromFile';
import removeAutoArchiveFlag from '/imports/api/creature/archive/methods/removeAutoArchiveFlag';
import { snackbar } from '/imports/client/ui/components/snackbars/SnackbarQueue';
import { uniq, flatten } from 'lodash';
import { characterSlotsRemaining } from '/imports/api/creature/creatures/methods/assertHasCharacterSlots';

const characterTransform = function(char) {
  return {
    _id: char._id,
    name: char.name,
    owner: char.owner,
    initial: char.name && char.name[0] || '?',
    alignment: char.alignment,
    gender: char.gender,
    race: char.race,
    isAutoArchive: false,
  };
};
const fileTransform = function(file) {
  return {
    _id: file.meta.creatureId,
    name: file.meta.creatureName,
    owner: file.userId,
    initial: file.meta.creatureName && file.meta.creatureName[0] || '?',
    isAutoArchive: !!file.meta.auto,
    archiveId: file._id,
  };
}

const creatureFields = {
  'color': 1,
  'avatarPicture': 1,
  'name': 1,
  'initial': 1,
  'alignment': 1,
  'gender': 1,
  'race': 1,
  'readers': 1,
  'writers': 1,
  'owner': 1,
};

export default {
  components: {
    DialogBase,
    CreatureFolderList,
  },
  data(){return {
    selectedCreature: null,
    mode: 'archive',
    archiveActionLoading: false,
  }},
  computed: {
    numSelected(){
      return this.selectedCreature ? 1 : 0;
    },
  },
  watch: {
    mode(){
      this.selectedCreature = null;
    },
  },
  methods: {
    archiveAction(){
      if (!this.selectedCreature) return;
      this.archiveActionLoading = true;
      if (this.mode === 'archive') {
        if (this.selectedCreature.isAutoArchive) {
          removeAutoArchiveFlag.call({
            archiveId: this.selectedCreature.archiveId
          }, error => {
            this.archiveActionLoading = false;
            if (!error) return;
            console.error(error);
            snackbar({text: error.reason});
          });
        } else {
          archiveCreatureToFile.call({
            creatureId: this.selectedCreature._id,
          }, error => {
            this.archiveActionLoading = false;
            if (!error) return;
            console.error(error);
            snackbar({text: error.reason});
          });
        }
      } else if (this.mode === 'restore'){
        restoreCreatureFromFile.call({
          fileId: this.selectedCreature.archiveId,
        }, error => {
          this.archiveActionLoading = false;
          if (!error) return;
          console.error(error);
          snackbar({text: error.reason});
        });
      }
      this.selectedCreature = null;
    }
  },
  meteor: {
    $subscribe: {
      'archivedCreatures': [],
      'archiveCreatureFiles': [],
      'characterList': [],
    },
    characterSlots(){
      return characterSlotsRemaining(Meteor.userId());
    },
    folders() {
      const userId = Meteor.userId();
      let folders =  CreatureFolders.find(
        {owner: userId, archived: {$ne: true}},
        {sort: {left: 1}},
      ).map(folder => {
        let foundCreatures = Creatures.find(
          {
            _id: { $in: folder.creatures || [] },
            owner: userId,
          }, 
          { sort: { name: 1 } }
        ).map(characterTransform);
        let foundArchives = ArchiveCreatureFiles.find(
          {
            'meta.creatureId': { $in: folder.creatures || [] },
            'meta.auto': true,
            userId,
          },
          { sort: { 'meta.creatureId': 1 } }
        ).map(fileTransform);

        folder.creatures = foundCreatures.concat(foundArchives).toSorted((a, b) => {
          if (a.meta) {
            var nameA = a.meta.creatureId;
          } else {
            var nameA = a.name;
          }
          if (b.meta) {
            var nameB = b.meta.creatureId;
          } else {
            var nameB = b.name;
          }
          return nameA.localeCompare(nameB);
        });
        return folder;
      });
      folders = folders.filter(folder => !!folder.creatures.length);
      return folders;
    },
    CreaturesWithNoParty() {
      var userId = Meteor.userId();
      var charArrays = CreatureFolders.find({ owner: userId }).map(p => p.creatures);
      var folderChars = uniq(flatten(charArrays));
      let foundCreatures = Creatures.find(
        {
          _id: { $nin: folderChars },
          owner: userId,
        },
        { sort: { name: 1 } }
      ).map(characterTransform);
      let foundArchives = ArchiveCreatureFiles.find(
        {
          'meta.creatureId': { $nin: folderChars },
          'meta.auto': true,
          userId,
        },
        { sort: { 'meta.creatureName': 1 } }
      ).map(fileTransform);
      return foundCreatures.concat(foundArchives).toSorted((a, b) => {
          if (a.meta) {
            var nameA = a.meta.creatureId;
          } else {
            var nameA = a.name;
          }
          if (b.meta) {
            var nameB = b.meta.creatureId;
          } else {
            var nameB = b.name;
          }
          return nameA.localeCompare(nameB);
        });
    },
    archivefolders(){
      const userId = Meteor.userId();
      let folders =  CreatureFolders.find(
        {owner: userId},
        {sort: {left: 1}},
      ).map(folder => {
        folder.creatures = ArchiveCreatureFiles.find(
          {
            'meta.creatureId': {$in: folder.creatures || []},
            $or: [
              { 'meta.auto': false },
              { 'meta.auto': { $exists: false } },
            ],
            userId,
          }, {
            sort: {'meta.creatureName': 1},
          }
        ).map(fileTransform);
        return folder;
      });
      folders = folders.filter(folder => !!folder.creatures.length);
      return folders;
    },
    archiveCreaturesWithNoParty() {
      var userId = Meteor.userId();
      var charArrays = CreatureFolders.find({owner: userId}).map(p => p.creatures);
      var folderChars = uniq(flatten(charArrays));
      return ArchiveCreatureFiles.find(
        {
          'meta.creatureId': { $nin: folderChars },
          $or: [
            { 'meta.auto': false },
            { 'meta.auto': { $exists: false } },
          ],
          userId,
        }, {
          sort: {'meta.creatureName': 1},
        }
      ).map(fileTransform);
    },
  }
}
</script>

<style lang="css" scoped>
</style>
