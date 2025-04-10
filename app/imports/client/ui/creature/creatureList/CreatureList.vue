<template lang="html">
  <draggable
    v-model="dataCreatures"
    style="min-height: 24px;"
    :sort="false"
    :group="`creature-list`"
    ghost-class="ghost"
    draggable=".creature"
    handle=".handle"
    @change="draggableChange"
  >
    <div v-for="creature in dataCreatures">
      <creature-list-tile
        v-if="!archive"
        :key="creature._id"
        class="creature"
        :model="creature"
        :selection="selection"
        :is-selected="selectedCreature === creature._id || selectedCreatures.has(creature._id)"
        v-bind="selection ? {} : {to: creature.url}"
        :dense="dense"
        :data-id="dense ? undefined : creature._id"
        @click="$emit('creature-selected', creature._id)"
      />
      <creature-archive-list-tile
        v-else
        :key="creature.id"
        class="creature"
        :model="creature"
        :dense="dense"
        :data-id="dense ? undefined : creature._id"
      />
    </div>
  </draggable>
</template>

<script lang="js">
  import CreatureListTile from '/imports/client/ui/creature/creatureList/CreatureListTile.vue';
  import CreatureArchiveListTile from '/imports/client/ui/creature/creatureList/CreatureArchiveListTile.vue';
  import draggable from 'vuedraggable';
  import moveCreatureToFolder from '/imports/api/creature/creatureFolders/methods.js/moveCreatureToFolder';
  import {snackbar} from '/imports/client/ui/components/snackbars/SnackbarQueue';

  export default {
    components: {
      CreatureListTile,
      CreatureArchiveListTile,
      draggable,
    },
    props: {
      creatures: {
        type: Array,
        required: true,
      },
      folderId: {
        type: String,
        default: null,
      },
      selection: Boolean,
      selectedCreature: {
        type: String,
        default: undefined,
      },
      selectedCreatures: {
        type: Set,
        default: () => new Set(),
      },
      archive: Boolean,
      dense: Boolean,
    },
    data(){return {
      dataCreatures: [],
    }},
    watch:{
      creatures(newValue){
        this.dataCreatures = newValue;
      },
    },
    mounted(){
      this.dataCreatures = this.creatures;
    },
    methods: {
      draggableChange({added, moved}){
        let event = added || moved;
        if (event){
          let doc = event.element;
          moveCreatureToFolder.call({
            creatureId: doc._id,
            folderId: this.folderId
          }, error => {
            if (!error) return;
            console.error(error);
            snackbar({
              text: error.reason,
            });
          });
        }
      },
      selectionChange(index){
        this.$emit('creatureSelected', this.dataCreatures[index]._id)
      },
    }
  }
</script>

<style lang="css" scoped>
</style>
