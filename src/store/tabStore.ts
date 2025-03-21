import { Connection } from './connectionStore.ts';
import { defineStore } from 'pinia';
import { sourceFileApi } from '../datasources';
import { CustomError } from '../common';
import { defaultCodeSnippet } from '../common/monaco';

type Panel = {
  id: number;
  name: string;
  connection?: Connection;
  file: string;
  content?: string;
};

const homePanel = { id: 0, name: 'home', file: '' };

export const useTabStore = defineStore('panel', {
  state: (): {
    panels: Array<Panel>;
    activePanel: Panel;
  } => ({
    activePanel: homePanel,
    panels: [homePanel],
  }),
  getters: {},
  actions: {
    async establishPanel(connectionOrFile: Connection | string): Promise<void> {
      const isFile = typeof connectionOrFile == 'string';
      if (isFile) {
        const activePanel = this.panels.find(panelItem => panelItem.file === connectionOrFile);
        if (activePanel) {
          this.activePanel = activePanel;
        } else {
          const newPanel: Panel = {
            id: this.panels.length + 1,
            name: connectionOrFile,
            file: connectionOrFile,
            content: await sourceFileApi.readFile(connectionOrFile),
          };
          this.panels.push(newPanel);
          this.activePanel = newPanel;
        }
      } else {
        const exists = this.panels.filter(
          panelItem => panelItem.connection?.id === connectionOrFile.id,
        );

        let fileName = !exists.length
          ? `${connectionOrFile.name}.search`
          : `${connectionOrFile.name}-${exists.length}.search`;
        let content = defaultCodeSnippet;

        if (await sourceFileApi.exists(fileName)) {
          content = await sourceFileApi.readFile(fileName);
        } else if (await sourceFileApi.exists(`.dockit/${fileName}`)) {
          fileName = `.dockit/${fileName}`;
          content = await sourceFileApi.readFile(fileName);
        }

        const newPanel: Panel = {
          id: this.panels.length + 1,
          name: fileName,
          connection: connectionOrFile,
          file: fileName,
          content,
        };

        this.panels.push(newPanel);
        this.activePanel = newPanel;
      }
    },

    async checkFileExists(panel: Panel | undefined) {
      let checkPanel = panel ?? this.activePanel;
      if (!checkPanel) return false;
      try {
        return await sourceFileApi.exists(checkPanel.file);
      } catch (err) {
        throw err;
      }
    },

    async closePanel(panel: Panel | undefined, saveFile: boolean): Promise<void> {
      if (!panel) return;
      try {
        if (saveFile) {
          await this.saveContent(panel, panel.content || '', true);
        }
        const selectedIndex = this.panels.findIndex(({ id }) => id === panel.id);

        this.panels.splice(selectedIndex, 1);
        if (panel.id === this.activePanel?.id) {
          this.activePanel = this.panels[Math.min(selectedIndex, this.panels.length - 1)];
        }
      } catch (err) {
        console.log(err);
        console.log('err str', JSON.stringify(err));
        throw new CustomError(500, (err as Error).message);
      }
    },

    setActivePanel(panelId: number): void {
      const selectedPanel = this.panels.find(({ id }) => id === panelId);
      if (!selectedPanel) return;
      this.activePanel = selectedPanel;
    },

    async saveContent(panel: Panel | undefined, content: string, validateFilePath = false): Promise<void> {
      let checkPanel = panel ?? this.activePanel;
      if (!checkPanel) return;
      checkPanel.content = content;

      let filePath = checkPanel.file;

      if (!(await sourceFileApi.exists(filePath)) && validateFilePath) {
        const selectedFolder = await sourceFileApi.selectFolder();
        filePath = `${selectedFolder}/${filePath}`;
        if (!filePath) {
          throw new CustomError(404, 'Folder not found');
        }
      }

      checkPanel.file = filePath;
      if (await sourceFileApi.exists(filePath)) {
        await sourceFileApi.saveFile(filePath, content);
      }
    },

    loadDefaultSnippet() {
      if (!this.activePanel) return;
      this.activePanel.content = defaultCodeSnippet;
    },
  },
  persist: {
    paths: ['currentPanel'],
    storage: localStorage,
  },
});
