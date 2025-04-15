<template>
  <div
    class="card-background"
    style="height: 100%"
  >
    <v-container>
      <v-row
        justify="center"
        class="mb-16"
      >
        <v-col
          cols="12"
          xl="8"
        >
          <v-alert
            v-if="characterSpaceLeft < 0"
            type="error"
          >
            You have exceeded your maximum number of character slots, archive or delete
            some characters.
          </v-alert>
          <v-alert
            v-else-if="characterSpaceLeft === 0"
            type="info"
          >
            You have hit your maximum number of characters.
            <archive-button
              small
              text
              class="mx-2"
            />
            or
            <v-btn
              href="https://www.patreon.com/join/dicecloud/"
              class="mx-2"
              target="_blank"
              small
              text
            >
              Increase Patreon tier
              <v-icon right>
                mdi-patreon
              </v-icon>
            </v-btn>
          </v-alert>
          <v-card :class="{ 'mb-4': folders && folders.length }">
            <creature-folder-list
              :creatures="CreaturesWithNoParty"
              :folders="folders"
            />
          </v-card>
          <div class="layout justify-end mt-2">
            <v-btn
              v-if="showImportButton"
              text
              data-id="import-character-button"
              @click="importCharacter"
            >
              import character
            </v-btn>
            <v-btn
              text
              :loading="loadingInsertFolder"
              @click="insertFolder"
            >
              add folder
            </v-btn>
          </div>
          <v-btn
            color="accent"
            fab
            fixed
            bottom
            right
            data-id="new-character-button"
            :disabled="characterSpaceLeft <= 0"
            @click="insertCharacter"
          >
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="js">
import Creatures from '/imports/api/creature/creatures/Creatures';
import CreatureFolders from '/imports/api/creature/creatureFolders/CreatureFolders';
import { characterSlotsRemaining } from '/imports/api/creature/creatures/methods/assertHasCharacterSlots';
import insertCreatureFolder from '/imports/api/creature/creatureFolders/methods.js/insertCreatureFolder';
import { snackbar } from '/imports/client/ui/components/snackbars/SnackbarQueue';
import CreatureFolderList from '/imports/client/ui/creature/creatureList/CreatureFolderList.vue';
import ArchiveButton from '/imports/client/ui/creature/creatureList/ArchiveButton.vue';
import ArchiveCreatureFiles from '/imports/api/creature/archive/ArchiveCreatureFiles';
import getCreatureUrlName from '/imports/api/creature/creatures/getCreatureUrlName';
import { uniq, flatten } from 'lodash';

const characterTransform = function (char) {
  return {
    _id: char._id,
    name: char.name,
    owner: char.owner,
    url: `/character/${char._id}/${getCreatureUrlName(char)}`,
    initial: char.name && char.name[0] || '?',
    alignment: char.alignment,
    gender: char.gender,
    race: char.race,
    avatarPicture: char.avatarPicture,
    isAutoArchive: false,
  };
};

const fileTransform = function (file) {
  return {
    _id: file.meta.creatureId,
    name: file.meta.creatureName,
    owner: file.userId,
    url: `/character/${file.meta.creatureId}/${getCreatureUrlName({name: file.meta.creatureName})}?archiveId=${file._id}`,
    initial: file.meta.creatureName && file.meta.creatureName[0] || '?',
    alignment: file.meta.creatureAlignment,
    gender: file.meta.creatureGender,
    race: file.meta.creatureRace,
    avatarPicture: file.meta.creatureAvatarPicture,
    isAutoArchive: !!file.meta.auto,
    archiveId: file._id,
  };
}

export default {
  components: {
    CreatureFolderList,
    ArchiveButton,
  },
  data() {
    return {
      fab: false,
      loadingInsertFolder: false,
      renamingFolder: undefined,
    }
  },
  meteor: {
    $subscribe: {
      'archiveCreatureFiles': [],
      'characterList': [],
    },
    folders() {
      const userId = Meteor.userId();
      let folders = CreatureFolders.find(
        { owner: userId, archived: { $ne: true } },
        { sort: { name: 1 } },
      ).map(folder => {
        let foundCreatures = Creatures.find(
          {
            _id: { $in: folder.creatures || [] },
            $or: [{ readers: userId }, { writers: userId }, { owner: userId }],
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
      return folders;
    },
    CreaturesWithNoParty() {
      var userId = Meteor.userId();
      var charArrays = CreatureFolders.find({ owner: userId }).map(p => p.creatures);
      var folderChars = uniq(flatten(charArrays));
      let foundCreatures = Creatures.find(
        {
          _id: { $nin: folderChars },
          $or: [{ readers: userId }, { writers: userId }, { owner: userId }],
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
    creatureCount() {
      let userId = Meteor.userId();
      return Creatures.find({
        owner: userId,
      }, {
        fields: { _id: 1 },
        }).count() + ArchiveCreatureFiles.find({ userId, 'meta.auto': true }).count();
    },
    characterSpaceLeft() {
      let userId = Meteor.userId();
      return characterSlotsRemaining(userId);
    },
    showImportButton() {
      return !Meteor.settings.public?.disallowCreatureApiImport;
    }
  },
  methods: {
    insertCharacter() {
      const self = this;
      self.$store.commit('pushDialogStack', {
        component: 'character-creation-dialog',
        elementId: 'new-character-button',
        callback: creatureId => creatureId,
      });
    },
    importCharacter() {
      const self = this;
      self.$store.commit('pushDialogStack', {
        component: 'character-import-dialog',
        elementId: 'import-character-button',
        callback: creatureId => creatureId,
      });
    },
    insertFolder() {
      this.loadingInsertFolder = true;
      insertCreatureFolder.call(error => {
        this.loadingInsertFolder = false;
        if (!error) return;
        console.error(error);
        snackbar({
          text: error.reason,
        });
      });
    },
  },
};
</script>
