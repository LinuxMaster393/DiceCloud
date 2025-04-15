<template>
  <v-fade-transition mode="out-in">
    <div
      v-if="!$subReady.singleCharacter && !restoreLoading"
      key="character-loading"
      class="fill-height layout justify-center align-center"
    >
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      />
    </div>
    <character-sheet
      v-else
      show-menu-button
      :creature-id="$route.params.id"
    />
  </v-fade-transition>
</template>

<script lang="js">
import CharacterSheet from '/imports/client/ui/creature/character/CharacterSheet.vue';
import ArchiveCreatureFiles from '/imports/api/creature/archive/ArchiveCreatureFiles';
import restoreCreatureFromFile from '/imports/api/creature/archive/methods/restoreCreatureFromFile';
import { snackbar } from '/imports/client/ui/components/snackbars/SnackbarQueue';

export default {
  components: {
    CharacterSheet,
  },
  data() {
    return {
      restoreLoading: false,
    };
  },
  meteor: {
    $subscribe: {
      'singleCharacter'() {
        return [this.$route.params.id];
      },
      'singleArchive'() {
        return [this.$route.query.archiveId];
      },
    },
  },
  watch: {
    '$subReady.singleArchive' () {
      if (!this.$route.query.archiveId) return;
      let archiveId = this.$route.query.archiveId;
      let creatureId = this.$route.params.id;
      const userId = Meteor.userId();
      let archive = ArchiveCreatureFiles.findOne(
        {
          _id: archiveId,
          'meta.creatureId': creatureId,
          'meta.auto': true,
          userId,
        }
      );
      if (!archive) {
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      this.restoreLoading = true;
      restoreCreatureFromFile.call({
        fileId: archiveId,
      }, error => {
          this.restoreLoading = false;
          if (!error) {
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
          console.error(error);
          snackbar({ text: error.reason });
        })
    },
  },
}
</script>
