<template>
  <div class="docs container mx-auto px-4 py-2">
    <!-- Top bar -->
    <nav class="flex items-stretch pl-4 pr-2 py-1 border border-gray-700 rounded bg-gray-800 shadow-xl">
      <div class="flex-initial flex items-center">
        <img class="flex-auto w-10 mr-5" src="../../img/logo.png" alt="" aria-hidden="true">

        <router-link to="/docs">
          <h1 class="flex-auto font-semibold">Zeppelin Documentation</h1>
        </router-link>
      </div>
      <div class="flex-1 flex items-center justify-end">
        <router-link
          to="/dashboard"
          role="menuitem"
          class="py-1 px-2 rounded hover:bg-gray-700">
          Go to dashboard
        </router-link>
      </div>
    </nav>

    <!-- WIP bar -->
    <div class="mt-6 px-3 py-2 rounded bg-gray-800 shadow-md">
      <alert class="mr-1 text-yellow-300" />
      This documentation is a work in progress.
    </div>

    <!-- Content wrapper -->
    <div class="flex items-start mt-8">
      <!-- Sidebar -->
      <nav class="docs-sidebar flex-none px-4 pt-2 pb-3 mr-8 border border-gray-700 rounded bg-gray-800 shadow-md">
        <div role="none" v-for="(group, index) in menu">
          <h1 class="font-bold" :aria-owns="'menu-group-' + index" :class="{'mt-4': index !== 0}">{{ group.label }}</h1>
          <ul v-bind:id="'menu-group-' + index" role="group" class="list-none pl-2">
            <li role="none" v-for="item in group.items">
              <router-link role="menuitem" :to="item.to" class="text-gray-300 hover:text-gray-500">{{ item.label }}</router-link>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Content -->
      <div class="docs-content main-content flex-auto overflow-x-hidden">
        <router-view :key="$route.fullPath"></router-view>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from "vue";
  import {mapState} from "vuex";
  import Alert from 'vue-material-design-icons/Alert.vue';

  type TMenuItem = {
    to: string;
    label: string;
  };
  type TMenuGroup = {
    label: string;
    items: TMenuItem[];
  };
  type TMenu = TMenuGroup[];

  const menu: TMenu = [
    {
      label: 'General',
      items: [
        {
          to: '/docs/introduction',
          label: 'Introduction',
        },
        {
          to: '/docs/configuration-format',
          label: 'Configuration format',
        },
        {
          to: '/docs/plugin-configuration',
          label: 'Plugin configuration',
        },
        {
          to: '/docs/permissions',
          label: 'Permissions',
        },
      ],
    },

    {
      label: 'Reference',
      items: [
        {
          to: '/docs/reference/argument-types',
          label: 'Argument types',
        },
      ],
    },

    {
      label: 'Setup guides',
      items: [
        {
          to: '/docs/setup-guides/logs',
          label: 'Logs',
        },
        {
          to: '/docs/setup-guides/moderation',
          label: 'Moderation',
        },
      ],
    },
  ];

  export default {
    components: { Alert },
    async mounted() {
      await this.$store.dispatch("docs/loadAllPlugins");
    },

    computed: {
      ...mapState('docs', {
        plugins: 'allPlugins',
      }),
      menu() {
        return [
          ...menu,
          {
            label: 'Plugins',
            items: this.plugins.map(plugin => ({
              label: plugin.info.prettyName || plugin.name,
              to: `/docs/plugins/${plugin.name}`,
            })),
          }
        ];
      },
    },
  };
</script>