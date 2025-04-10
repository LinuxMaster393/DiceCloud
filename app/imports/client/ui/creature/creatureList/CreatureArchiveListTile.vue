<template
  lang="html"
  functional
>
  <v-list-item
    slot="header"
    v-bind="$attrs"
    @click="restore(false)"
    @click.middle="restore(true)"
  >
    <v-list-item-avatar
      :color="model.color || 'grey'"
      :size="dense ? 30 : undefined"
      class="white--text"
      style="transition: background 0.3s;"
    >
      <v-fade-transition leave-absolute>
        <img
          v-if="model.avatarPicture"
          :src="model.avatarPicture"
          :alt="model.name"
        >
        <template v-else>
          <span>
            {{ model.initial }}
          </span>
        </template>
      </v-fade-transition>
    </v-list-item-avatar>
    <v-list-item-content>
      <v-list-item-title>
        {{ model.name }}
      </v-list-item-title>
      <v-list-item-subtitle v-if="!dense">
        {{ model.alignment }} {{ model.gender }} {{ model.race }}
      </v-list-item-subtitle>
    </v-list-item-content>
    <v-list-item-action v-if="!dense && characterSlots > 0">
      <v-btn
        text
        :loading="restoreLoading"
        @click="restore(false)"
        @click.middle="restore(true)"
      >
        Restore
      </v-btn>
    </v-list-item-action>
  </v-list-item>
</template>

<script lang="js">
import restoreCreatureFromFile from '/imports/api/creature/archive/methods/restoreCreatureFromFile';
import { snackbar } from '/imports/client/ui/components/snackbars/SnackbarQueue';
import { characterSlotsRemaining } from '/imports/api/creature/creatures/methods/assertHasCharacterSlots';
import getCreatureUrlName from '/imports/api/creature/creatures/getCreatureUrlName';

export default {
  components: {
  },
  props: {
    model: {
      type: Object,
      required: true,
    },
    dense: Boolean,
  },
  data() {
    return {
      dataItems: [],
      restoreLoading: false,
    };
  },
  meteor: {
    characterSlots() {
      return characterSlotsRemaining(Meteor.userId());
    },
  },
  methods: {
    restore(newTab) {
      if (this.restoreLoading) {
        return;
      }
      this.restoreLoading = true;
      restoreCreatureFromFile.call({
        fileId: this.model._id,
      }, error => {
          this.restoreLoading = false;
          if (!error) {
            if (!!this.model._id && this.model.name) {
              if (newTab) {
                let route = this.$router.resolve(`/character/${this.model.creatureId}/${getCreatureUrlName(this.model)}`);
                window.open(route.href, '_blank');
              } else {
                this.$router.push(`/character/${this.model.creatureId}/${getCreatureUrlName(this.model)}`);
              }
            }
            return;
          }
          console.error(error);
          snackbar({ text: error.reason });
        })
    }
  }
}
</script>
