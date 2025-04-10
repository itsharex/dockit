<template>
  <main>
    <n-tabs type="segment" animated @update:value="refresh">
      <n-tab-pane name="indices" tab="INDICES">
        <n-data-table
          :columns="indexTableColumns"
          :data="indexTableData"
          :bordered="false"
          max-height="400"
        />
      </n-tab-pane>
      <n-tab-pane name="templates" tab="TEMPLATES">
        <n-data-table
          :columns="templateTableColumns"
          :data="templateTableData"
          :bordered="false"
          max-height="400"
        />
      </n-tab-pane>
      <template #suffix>
        <div class="tab-action-group">
          <n-button type="default" tertiary @click="handleRefresh">
            <template #icon>
              <n-icon>
                <Renew />
              </n-icon>
            </template>
            Refresh
          </n-button>
          <n-button secondary type="success" @click="toggleModal('index')">
            <template #icon>
              <n-icon>
                <Add />
              </n-icon>
            </template>
            New Index
          </n-button>
          <n-button secondary type="success" @click="toggleModal('alias')">
            <template #icon>
              <n-icon>
                <Add />
              </n-icon>
            </template>
            New Alias
          </n-button>
          <n-button secondary type="success" @click="toggleModal('template')">
            <template #icon>
              <n-icon>
                <Add />
              </n-icon>
            </template>
            New Template
          </n-button>
        </div>
      </template>
    </n-tabs>
    <index-dialog ref="indexDialogRef" />
    <alias-dialog ref="aliasDialogRef" />
    <template-dialog ref="templateDialogRef" />
    <switch-alias-dialog ref="switchAliasDialogRef" />
  </main>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { get } from 'lodash';
import { ClusterAlias, ClusterIndex, IndexHealth, useClusterManageStore } from '../../../store';
import { NButton, NDropdown, NIcon, NTag, NInput } from 'naive-ui';
import {
  Add,
  ArrowsHorizontal,
  Renew,
  SettingsAdjust,
  Unlink,
  OverflowMenuHorizontal,
  Delete,
  Locked,
  Unlocked,
  Search,
} from '@vicons/carbon';
import IndexDialog from './index-dialog.vue';
import AliasDialog from './alias-dialog.vue';
import TemplateDialog from './template-dialog.vue';
import { useLang } from '../../../lang';
import { CustomError, inputProps } from '../../../common';
import SwitchAliasDialog from './switch-alias-dialog.vue';

const message = useMessage();
const dialog = useDialog();
const lang = useLang();

const clusterManageStore = useClusterManageStore();
const {
  fetchIndices,
  fetchAliases,
  fetchTemplates,
  deleteIndex,
  closeIndex,
  openIndex,
  removeAlias,
} = clusterManageStore;
const { indexWithAliases, templates } = storeToRefs(clusterManageStore);

const indexDialogRef = ref();
const aliasDialogRef = ref();
const templateDialogRef = ref();
const switchAliasDialogRef = ref();

const indexTableData = ref(indexWithAliases.value);
const templateTableData = ref(templates.value);

const filtersRef = ref<{ [key: string]: string }>({
  index: '',
  uuid: '',
  health: '',
  status: '',
  name: '', // for template table
  type: '', // for template table
});

const handleFilter = (key: string, value: string) => {
  filtersRef.value[key] = value;

  if (['name', 'type'].includes(key)) {
    templateTableData.value = templates.value.filter(item =>
      get(item, key, '').toLowerCase().includes(value.toLowerCase()),
    );
  } else {
    indexTableData.value = indexWithAliases.value.filter(item =>
      get(item, key, '').toLowerCase().includes(value.toLowerCase()),
    );
  }
};

const filterProps = (key: string) => ({
  filter: true,
  renderFilterMenu(_: { hide: () => void }) {
    return h(NInput, {
      value: filtersRef.value[key],
      placeholder: `type to filter ${key}`,
      clearable: true,
      size: 'small',
      'on-update:value': (value: string) => handleFilter(key, value),
      'input-props': inputProps,
    });
  },
  renderFilterIcon() {
    return h(NIcon, {}, { default: () => h(Search) });
  },
});

const indexTableColumns = ref([
  {
    title: 'Index',
    dataIndex: 'index',
    key: 'index',
    ...filterProps('index'),
  },
  { title: 'UUID', dataIndex: 'uuid', key: 'uuid', ...filterProps('uuid') },
  {
    title: 'health',
    dataIndex: 'health',
    key: 'health',
    ...filterProps('health'),
    render({ health }: ClusterIndex) {
      return (
        (health === IndexHealth.GREEN ? '🟢' : health === IndexHealth.YELLOW ? '🟡' : '🔴') +
        ` ${health}`
      );
    },
  },
  { title: 'status', dataIndex: 'status', key: 'status', ...filterProps('status') },
  {
    title: 'Aliases',
    dataIndex: 'aliases',
    key: 'aliases',
    resizable: true,
    render: ({ aliases }: { aliases: Array<ClusterAlias> }) =>
      aliases.map(alias =>
        h(
          NButton,
          {
            strong: true,
            type: 'default',
            tertiary: true,
            iconPlacement: 'right',
            style: 'margin-right: 8px',
          },
          {
            default: () => `${alias.alias}`,
            icon: () =>
              h(
                NDropdown,
                {
                  trigger: 'click',
                  placement: 'bottom-end',
                  onSelect: event => handleAction(event, alias.index, alias.alias),
                  options: [
                    {
                      label: lang.t('manage.index.actions.removeAlias'),
                      key: 'removeAlias',
                      icon: () => h(NIcon, { color: 'red' }, { default: () => h(Unlink) }),
                    },
                    {
                      label: lang.t('manage.index.actions.switchAlias'),
                      key: 'switchAlias',
                      icon: () => h(NIcon, {}, { default: () => h(ArrowsHorizontal) }),
                    },
                  ],
                },
                { default: () => h(NIcon, {}, { default: () => h(SettingsAdjust) }) },
              ),
          },
        ),
      ),
  },
  {
    title: 'Docs',
    dataIndex: 'docs',
    key: 'docs',
    render({ docs }: ClusterIndex) {
      return docs.count;
    },
  },
  {
    title: 'shards',
    dataIndex: 'shards',
    key: 'shards',
    render({ shards }: ClusterIndex) {
      return `${shards.primary}p/${shards.replica}r`;
    },
  },
  { title: 'Storage', dataIndex: 'storage', key: 'storage' },
  {
    title: 'Actions',
    dataIndex: 'actions',
    key: 'actions',
    render(index: ClusterIndex) {
      return h(
        NDropdown,
        {
          trigger: 'click',
          placement: 'bottom-end',
          onSelect: event => handleAction(event, index.index),
          options: [
            {
              label: lang.t('manage.index.actions.deleteIndex'),
              key: 'deleteIndex',
              icon: () => h(NIcon, { color: 'red' }, { default: () => h(Delete) }),
            },
            index.status === 'open'
              ? {
                  label: lang.t('manage.index.actions.closeIndex'),
                  key: 'closIndex',
                  icon: () => h(NIcon, { color: 'yellow' }, { default: () => h(Locked) }),
                }
              : {
                  label: lang.t('manage.index.actions.openIndex'),
                  key: 'openIndex',
                  icon: () => h(NIcon, { color: 'green' }, { default: () => h(Unlocked) }),
                },
          ],
        },
        {
          default: () =>
            h(NIcon, { style: 'cursor: pointer' }, { default: () => h(OverflowMenuHorizontal) }),
        },
      );
    },
  },
]);

const templateTableColumns = ref([
  { title: 'Template Name', dataIndex: 'name', key: 'name', ...filterProps('name') },
  { title: 'Type', dataIndex: 'type', key: 'type', ...filterProps('type') },
  { title: 'Order', dataIndex: 'order', key: 'order' },
  { title: 'Version', dataIndex: 'version', key: 'version' },
  { title: 'Mappings', dataIndex: 'mapping_count', key: 'mapping_count' },
  { title: 'Settings', dataIndex: 'settings_count', key: 'settings_count' },
  { title: 'Aliases', dataIndex: 'alias_count', key: 'alias_count' },
  { title: 'Metadata', dataIndex: 'metadata', key: 'metadata' },
  {
    title: 'Included In',
    dataIndex: 'included_in',
    key: 'included_in',
    render: ({ included_in }: { included_in: Array<string> }) =>
      included_in?.map(included => h(NTag, null, { default: () => included })),
  },
  {
    title: 'Index Patterns',
    dataIndex: 'index_patterns',
    key: 'index_patterns',
    render: ({ index_patterns }: { index_patterns: Array<string> }) =>
      index_patterns?.map(pattern => h(NTag, null, { default: () => pattern })),
  },
  {
    title: 'Composed Of',
    dataIndex: 'composed_of',
    key: 'composed_of',
    render: ({ composed_of }: { composed_of: Array<string> }) =>
      composed_of?.map(composed => h(NTag, null, { default: () => composed })),
  },
]);

const refresh = async () => {
  await Promise.all([fetchIndices(), fetchAliases(), fetchTemplates()]);
};

const handleRefresh = async () => {
  try {
    await refresh();
  } catch (err) {
    message.error(
      `status: ${(err as CustomError).status}, details: ${(err as CustomError).details}`,
      {
        closable: true,
        keepAliveOnHover: true,
        duration: 3000,
      },
    );
  }
};

const toggleModal = (target: string) => {
  if (target === 'index') indexDialogRef.value.toggleModal();
  if (target === 'alias') aliasDialogRef.value.toggleModal();
  if (target === 'template') templateDialogRef.value.toggleModal();
};

const handleAction = async (action: string, indexName: string, aliasName?: string) => {
  if (action === 'deleteIndex') {
    dialog.warning({
      title: lang.t('dialogOps.warning'),
      content: lang.t('manage.index.actions.deleteIndexWarning') + `:${indexName} ?`,
      positiveText: lang.t('dialogOps.confirm'),
      negativeText: lang.t('dialogOps.cancel'),
      onPositiveClick: async () => {
        try {
          await deleteIndex(indexName);
          await refresh();
          message.success(lang.t('dialogOps.deleteSuccess'));
        } catch (err) {
          message.error((err as CustomError).details, {
            closable: true,
            keepAliveOnHover: true,
          });
        }
      },
    });
  } else if (action === 'closIndex') {
    dialog.warning({
      title: lang.t('dialogOps.warning'),
      content: lang.t('manage.index.actions.closeIndexWarning') + `:${indexName} ?`,
      positiveText: lang.t('dialogOps.confirm'),
      negativeText: lang.t('dialogOps.cancel'),
      onPositiveClick: async () => {
        try {
          await closeIndex(indexName);
          await refresh();
          message.success(lang.t('dialogOps.closeSuccess'));
        } catch (err) {
          message.error((err as CustomError).details, {
            closable: true,
            keepAliveOnHover: true,
          });
        }
      },
    });
  } else if (action === 'openIndex') {
    try {
      await openIndex(indexName);
      await refresh();
      message.success(lang.t('dialogOps.openSuccess'));
    } catch (err) {
      message.error((err as CustomError).details, {
        closable: true,
        keepAliveOnHover: true,
      });
    }
  } else if (action === 'removeAlias') {
    dialog.warning({
      title: lang.t('dialogOps.warning'),
      content: lang.t('manage.index.actions.removeAliasWarning') + ` ${indexName}@${aliasName} ?`,
      positiveText: lang.t('dialogOps.confirm'),
      negativeText: lang.t('dialogOps.cancel'),
      onPositiveClick: async () => {
        try {
          await removeAlias(indexName, aliasName as string);
          await refresh();
          message.success(lang.t('dialogOps.removeSuccess'));
        } catch (err) {
          message.error((err as CustomError).details, {
            closable: true,
            keepAliveOnHover: true,
            duration: 7200,
          });
        }
      },
    });
  } else if (action === 'switchAlias') {
    switchAliasDialogRef.value.toggleModal(aliasName, indexName);
  }
};

onMounted(async () => {
  await handleRefresh();
});
</script>

<style lang="scss" scoped>
.tab-action-group {
  display: flex;
  justify-content: space-around;
  width: 500px;
}
</style>
