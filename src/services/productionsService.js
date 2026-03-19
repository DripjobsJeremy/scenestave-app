(
  function () {
    const STORAGE_KEY = 'showsuite_productions';
    const ACTIVE_KEY = 'showsuite_active_production';

    const generateId = () => {
      return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };

    window.productionsService = {
      getAll() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      },

      getProductionById(id) {
        const productions = this.getAll();
        return productions.find((prod) => prod.id === id);
      },

      getById(id) {
        const productions = this.getAll();
        return productions.find((p) => p.id === id);
      },

      create(productionData) {
        const productions = this.getAll();
        const newProduction = {
          id: generateId(),
          title: productionData.title,
          director: productionData.director || '',
          startDate: productionData.startDate || '',
          endDate: productionData.endDate || '',
          status: productionData.status || 'Planning',
          description: productionData.description || '',
          venue: productionData.venue || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        productions.push(newProduction);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(productions));

        if (productions.length === 1) {
          this.setActive(newProduction.id);
        }

        return newProduction;
      },

      update(id, updates) {
        const productions = this.getAll();
        const index = productions.findIndex((p) => p.id === id);
        if (index !== -1) {
          productions[index] = {
            ...productions[index],
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(productions));
          return productions[index];
        }
        return null;
      },

      updateProduction(id, updates) {
        const productions = this.getAll();
        const index = productions.findIndex((prod) => prod.id === id);
        if (index !== -1) {
          productions[index] = { ...productions[index], ...updates, updatedAt: new Date().toISOString() };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(productions));
          return productions[index];
        }
        return null;
      },

      delete(id) {
        const productions = this.getAll();
        const filtered = productions.filter((p) => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

        const activeId = this.getActive();
        if (activeId === id) {
          localStorage.removeItem(ACTIVE_KEY);
          if (filtered.length > 0) {
            this.setActive(filtered[0].id);
          }
        }

        return true;
      },

      getActive() {
        return localStorage.getItem(ACTIVE_KEY);
      },

      setActive(id) {
        localStorage.setItem(ACTIVE_KEY, id);
        return true;
      },

      getActiveProduction() {
        const activeId = this.getActive();
        return activeId ? this.getById(activeId) : null;
      },
    };
  }
)();
