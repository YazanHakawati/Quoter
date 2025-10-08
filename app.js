const USER_STORAGE_KEY = 'zuccess_user';
const DRAFT_STORAGE_KEY = 'zuccess_quotation_draft_v2';
// Removed artificial delay before PDF generation
const PDF_GENERATION_DELAY_MS = 0;

class ZuccessQuoter {
    constructor() {
        this.currentUser = null;
        this.pendingBrand = null;
        this.selectedBrand = '';
        this.selectedProducts = [];
        this.activeProducts = {};
        this.currentCatalogBrand = '';
        this.activeCategory = 'panels';
        this.currentPage = 'landing-page';
        this.stepOrder = ['landing-page', 'catalog-page', 'labor-page', 'customer-page'];
        this.isRestoring = false;
        this.isGenerating = false;
        this.hasRestoredDraft = false;
        this.supabaseClient = null;
        this.supabaseClientPromise = null;

        this.brandMeta = typeof BRAND_CONFIG !== 'undefined' ? BRAND_CONFIG : {};
        this.documentAssets = typeof DOCUMENT_ASSETS !== 'undefined' ? DOCUMENT_ASSETS : {};
        this.fallbackProductsUrl = typeof FALLBACK_PRODUCTS_URL !== 'undefined' ? FALLBACK_PRODUCTS_URL : null;
        this.fallbackProducts = null;
        this.defaultAccent = null;

        this.quotationData = this.createEmptyQuotation();
        this.dom = {};

        this.init();
    }

    createEmptyQuotation() {
        return {
            products: [],
            labor: {
                days: 5,
                programmingFee: 0,
                installationFee: 0,
                discount: 0,
                discountInput: ''
            },
            customer: {
                name: '',
                phone: '',
                location: '',
                notes: ''
            },
            total: 0
        };
    }

    async init() {
        this.cacheDom();
        this.defaultAccent = getComputedStyle(document.documentElement).getPropertyValue('--brand-accent') || '#EA7946';
        this.resetBrandTheme();
        this.setupEventListeners();
        this.checkAuthState();
        await this.restoreDraft();
        this.resumeFlowState();
        this.updateStepIndicator(this.currentPage);
        this.updateSelectedSummary({ animate: false });
        this.updateLaborPageDisplay();
    }

    resumeFlowState() {
        if (!this.currentUser || this.hasRestoredDraft) {
            return;
        }

        const shouldShowCatalog = this.currentPage === 'landing-page' || !this.selectedBrand;
        const targetPage = shouldShowCatalog ? 'catalog-page' : this.currentPage;
        this.showPage(targetPage);

        if (!this.selectedBrand && this.dom.brandModal && !this.dom.brandModal.classList.contains('active')) {
            this.openBrandModal();
        }
    }

    cacheDom() {
        this.dom = {
            loginForm: document.getElementById('login-form'),
            navUser: document.getElementById('nav-user'),
            userName: document.getElementById('user-name'),
            logoutBtn: document.getElementById('logout-btn'),
            brandModal: document.getElementById('brand-modal'),
            brandSelect: document.getElementById('brand-select'),
            brandConfirmBtn: document.getElementById('brand-confirm-btn'),
            loadQuoteInput: document.getElementById('load-quotation-number'),
            loadQuoteBtn: document.getElementById('load-quotation-btn'),
            brandPreview: document.getElementById('brand-preview'),
            brandPreviewLogo: document.getElementById('brand-preview-logo'),
            brandPreviewName: document.getElementById('brand-preview-name'),
            changeBrandBtn: document.getElementById('change-brand-btn'),
            brandBanner: document.getElementById('brand-banner'),
            catalogBrandLogo: document.getElementById('catalog-brand-logo'),
            catalogBrandName: document.getElementById('catalog-brand-name'),
            proceedLaborBtn: document.getElementById('proceed-labor-btn'),
            proceedCustomerBtn: document.getElementById('proceed-customer-btn'),
            backToCatalogBtn: document.getElementById('back-to-catalog-btn'),
            backToLaborBtn: document.getElementById('back-to-labor-btn'),
            calculateTotalBtn: document.getElementById('calculate-total-btn'),
            generatePdfBtn: document.getElementById('generate-pdf-btn'),
            confirmGenerateBtn: document.getElementById('confirm-generate-btn'),
            selectedSummary: document.getElementById('selected-summary'),
            selectedCount: document.getElementById('selected-count'),
            selectedTotal: document.getElementById('selected-total'),
            productsGrid: document.getElementById('products-grid'),
            productsEmptyState: document.getElementById('products-empty-state'),
            stepper: document.getElementById('stepper'),
            reviewModal: document.getElementById('review-modal'),
            reviewProducts: document.getElementById('review-products'),
            reviewLabor: document.getElementById('review-labor'),
            reviewCustomer: document.getElementById('review-customer'),
            loadingOverlay: document.getElementById('loading-overlay'),
            workDaysInput: document.getElementById('work-days'),
            programmingInput: document.getElementById('programming-fee'),
            installationInput: document.getElementById('installation-fee'),
            discountInput: document.getElementById('discount'),
            productsTotal: document.getElementById('products-total'),
            installationTotal: document.getElementById('installation-total'),
            programmingTotal: document.getElementById('programming-total'),
            discountTotal: document.getElementById('discount-total'),
            grandTotal: document.getElementById('grand-total'),
            customerName: document.getElementById('customer-name'),
            customerPhone: document.getElementById('customer-phone'),
            customerLocation: document.getElementById('building-location'),
            customerNotes: document.getElementById('extra-notes')
        };
        this.dom.categoryTabs = Array.from(document.querySelectorAll('.category-tab'));
    }

    setupEventListeners() {
        const {
            brandSelect,
            brandConfirmBtn,
            loginForm,
            changeBrandBtn,
            proceedLaborBtn,
            proceedCustomerBtn,
            backToCatalogBtn,
            backToLaborBtn,
            calculateTotalBtn,
            generatePdfBtn,
            confirmGenerateBtn,
            logoutBtn,
            stepper,
            reviewModal
        } = this.dom;

        if (brandSelect) {
            brandSelect.addEventListener('change', event => this.handleBrandSelection(event));
        }

        if (brandConfirmBtn) {
            brandConfirmBtn.addEventListener('click', () => this.confirmBrandSelection());
        }

        if (this.dom.loadQuoteBtn) {
            this.dom.loadQuoteBtn.addEventListener('click', () => this.handleLoadQuotationClick());
        }

        if (changeBrandBtn) {
            changeBrandBtn.addEventListener('click', () => this.openBrandModal());
        }

        if (loginForm) {
            loginForm.addEventListener('submit', event => this.handleLogin(event));
        }

        if (proceedLaborBtn) {
            proceedLaborBtn.addEventListener('click', () => this.goToLaborPage());
        }

        if (proceedCustomerBtn) {
            proceedCustomerBtn.addEventListener('click', () => this.goToCustomerPage());
        }

        if (backToCatalogBtn) {
            backToCatalogBtn.addEventListener('click', () => this.showPage('catalog-page'));
        }

        if (backToLaborBtn) {
            backToLaborBtn.addEventListener('click', () => this.showPage('labor-page'));
        }

        if (calculateTotalBtn) {
            calculateTotalBtn.addEventListener('click', () => this.calculateTotal());
        }

        if (generatePdfBtn) {
            generatePdfBtn.addEventListener('click', () => this.handleReviewRequest());
        }

        if (confirmGenerateBtn) {
            confirmGenerateBtn.addEventListener('click', () => this.finalizeQuotation());
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        if (stepper) {
            stepper.addEventListener('click', event => this.handleStepperClick(event));
        }

        if (reviewModal) {
            reviewModal.addEventListener('click', event => this.handleReviewModalClick(event));
        }

        if (this.dom.categoryTabs.length) {
            this.dom.categoryTabs.forEach(tab => {
                tab.addEventListener('click', event => this.handleCategoryChange(event));
            });
        }

        ['workDaysInput', 'programmingInput', 'installationInput', 'discountInput'].forEach(key => {
            const input = this.dom[key];
            if (input) {
                input.addEventListener('input', () => this.calculateTotal({ silent: true }));
            }
        });

        ['customerName', 'customerPhone', 'customerLocation', 'customerNotes'].forEach(key => {
            const input = this.dom[key];
            if (input) {
                input.addEventListener('input', () => this.handleCustomerFieldInput());
                input.addEventListener('blur', () => this.handleCustomerFieldInput());
            }
        });
    }

    handleBrandSelection(event) {
        const brand = event.target.value || '';
        this.pendingBrand = brand || null;
        this.updateBrandPreview(brand);
        this.updateBrandConfirmState();
    }

    openBrandModal() {
        this.showBrandModal(true);
    }

    showBrandModal(show = true) {
        if (!this.dom.brandModal) {
            return;
        }

        this.dom.brandModal.classList.toggle('active', show);
        if (show) {
            this.prepareBrandModal();
        }
    }

    prepareBrandModal() {
        if (!this.dom.brandSelect) {
            return;
        }
        this.populateBrandOptions();
        const current = this.pendingBrand || this.selectedBrand || '';
        this.dom.brandSelect.value = current;
        this.pendingBrand = current || null;
        this.updateBrandPreview(current);
        this.updateBrandConfirmState();
    }

    updateBrandPreview(brandKey) {
        const preview = this.dom.brandPreview;
        if (!preview) {
            return;
        }

        const brand = this.brandMeta?.[brandKey];
        if (brand) {
            if (this.dom.brandPreviewLogo) {
                this.dom.brandPreviewLogo.src = brand.websiteLogo || '';
                this.dom.brandPreviewLogo.alt = `${brand.label || brandKey} logo`;
            }
            if (this.dom.brandPreviewName) {
                this.dom.brandPreviewName.textContent = brand.label || brandKey;
            }
            preview.hidden = false;
        } else {
            preview.hidden = true;
        }
    }

    populateBrandOptions() {
        if (!this.dom.brandSelect) {
            return;
        }

        const select = this.dom.brandSelect;
        const previousValue = this.pendingBrand || this.selectedBrand || '';
        select.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a brand...';
        placeholder.selected = !previousValue;
        select.appendChild(placeholder);

        const entries = Object.entries(this.brandMeta || {});
        entries.sort((a, b) => {
            const labelA = a[1]?.label || a[0];
            const labelB = b[1]?.label || b[0];
            return labelA.localeCompare(labelB);
        });

        entries.forEach(([key, meta]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = meta?.label || key;
            if (meta?.comingSoon) {
                option.disabled = true;
            }
            if (key === previousValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    updateBrandConfirmState() {
        if (!this.dom.brandConfirmBtn) {
            return;
        }
        const brandKey = this.pendingBrand || '';
        const meta = this.brandMeta?.[brandKey];
        const canContinue = Boolean(brandKey && !(meta && meta.comingSoon));
        this.dom.brandConfirmBtn.disabled = !canContinue;
    }

    async handleLoadQuotationClick() {
        const quoteNumber = this.dom.loadQuoteInput?.value.trim();
        if (!quoteNumber) {
            this.showNotification('Please enter a quotation number', 'error');
            return;
        }

        try {
            const record = await this.fetchQuotationByNumber(quoteNumber);
            if (!record) {
                this.showNotification('Quotation not found', 'error');
                return;
            }

            await this.applyLoadedQuotation(record);
            this.showNotification('Quotation loaded and synced to catalog', 'success');
            this.showBrandModal(false);
            this.showPage('catalog-page');
        } catch (error) {
            console.error('Load quotation error:', error);
            this.showNotification(error?.message || 'Unable to load quotation', 'error');
        }
    }

    async fetchQuotationByNumber(quotationNumber) {
        const client = await this.ensureSupabaseClient();
        if (!client) {
            throw new Error('Supabase is not configured. Cannot load quotations.');
        }

        const tableName = (typeof TABLES !== 'undefined' && TABLES.QUOTATIONS) ? TABLES.QUOTATIONS : 'quotations';
        const { data, error } = await this.runWithRetry(
            () => client
                .from(tableName)
                .select('quotation_number, selected_products, labor_days, programming_fee, installation_fee, discount, customer_name, customer_phone, building_location, extra_notes')
                .eq('quotation_number', quotationNumber)
                .maybeSingle(),
            { retries: 1, timeoutMs: 8000, backoffMs: 600 }
        );

        if (error) {
            throw new Error(error.message || 'Error fetching quotation');
        }

        return data || null;
    }

    async applyLoadedQuotation(record) {
        const items = Array.isArray(record?.selected_products) ? record.selected_products : [];
        if (!items.length) {
            throw new Error('Quotation has no selected products to load');
        }

        // Deduce brand from first product id (e.g., "orvibo-...", "zuccess-...")
        const firstId = items[0]?.id || '';
        const brandKey = String(firstId).split('-')[0].toLowerCase();
        const validBrand = this.brandMeta?.[brandKey] ? brandKey : (this.selectedBrand || '');
        if (!validBrand) {
            throw new Error('Unable to determine brand from the quotation');
        }

        const isChanging = this.selectedBrand !== validBrand;
        if (isChanging) {
            this.resetSelectionsForBrandChange();
        }

        this.selectedBrand = validBrand;
        this.pendingBrand = validBrand;
        if (this.dom.brandSelect) {
            this.dom.brandSelect.value = validBrand;
        }
        this.applyBrandTheme(validBrand);
        this.updateBrandConfirmState();

        // Ensure catalog is loaded for the brand
        await this.ensureProductsLoaded(true);

        // Pre-seed existing selection so option values can be respected even if the card isn't in the DOM
        this.selectedProducts = items.map(sp => ({
            id: sp.id,
            name: sp.name || '',
            description: sp.description || '',
            price: Number(sp.price) || 0,
            quantity: 0,
            subtotal: 0,
            selectedColor: sp.selectedColor || '',
            selectedProtocol: sp.selectedProtocol || ''
        }));

        // Apply quantities (uses options from existing selection when card is not present)
        for (const sp of items) {
            const qty = Number(sp.quantity) || 0;
            if (qty > 0) {
                this.updateProductQuantity(sp.id, qty, { silent: true });
            }
        }

        // Try to switch to the category of the first product for UX
        const firstProduct = this.findProductById(items[0].id);
        if (firstProduct?.category) {
            this.showCategory(firstProduct.category, { silent: true });
        } else {
            this.showCategory(this.activeCategory, { silent: true });
        }

        // Optionally load labor/customer details if present
        if (typeof record.labor_days === 'number' && this.dom.workDaysInput) {
            this.dom.workDaysInput.value = record.labor_days;
        }
        if (typeof record.programming_fee === 'number' && this.dom.programmingInput) {
            this.dom.programmingInput.value = record.programming_fee;
        }
        if (typeof record.installation_fee === 'number' && this.dom.installationInput) {
            this.dom.installationInput.value = record.installation_fee;
        }
        if (typeof record.discount === 'number' && this.dom.discountInput) {
            // Put numeric discount into input so calculation picks it up
            this.dom.discountInput.value = String(Number(record.discount) || 0);
        }

        // Customer (kept minimal; not required to sync products)
        if (record.customer_name) this.dom.customerName.value = record.customer_name;
        if (record.customer_phone) this.dom.customerPhone.value = record.customer_phone;
        if (record.building_location) this.dom.customerLocation.value = record.building_location;
        if (record.extra_notes) this.dom.customerNotes.value = record.extra_notes;

        // Recalculate totals and persist
        this.calculateTotal({ silent: true });
        this.updateSelectedSummary({ animate: false });
        this.persistDraft();
    }

    async confirmBrandSelection() {
        if (!this.pendingBrand) {
            this.showNotification('Please select a brand before continuing', 'error');
            return;
        }

        const isChangingBrand = this.selectedBrand && this.selectedBrand !== this.pendingBrand;
        if (isChangingBrand) {
            this.resetSelectionsForBrandChange();
        }

        this.selectedBrand = this.pendingBrand;
        this.pendingBrand = this.selectedBrand;
        this.applyBrandTheme(this.selectedBrand);
        this.updateBrandConfirmState();
        this.persistDraft();
        this.showBrandModal(false);
        await this.startEstimation();
    }

    resetSelectionsForBrandChange() {
        this.selectedProducts = [];
        this.quotationData.products = [];
        this.updateSelectedSummary({ animate: false });
        this.updateLaborPageDisplay();
        this.calculateTotal({ silent: true });
    }

    applyBrandTheme(brandKey) {
        const brand = this.brandMeta?.[brandKey];
        const accent = brand?.accent || this.defaultAccent || '#EA7946';
        document.documentElement.style.setProperty('--brand-accent', accent);

        if (this.dom.catalogBrandLogo) {
            if (brand?.websiteLogo) {
                this.dom.catalogBrandLogo.src = brand.websiteLogo;
                this.dom.catalogBrandLogo.alt = `${brand.label || brandKey} logo`;
                this.dom.catalogBrandLogo.hidden = false;
            } else {
                this.dom.catalogBrandLogo.hidden = true;
            }
        }

        if (this.dom.catalogBrandName) {
            this.dom.catalogBrandName.textContent = brand?.label || 'Select a brand to continue';
        }

        if (this.dom.changeBrandBtn) {
            this.dom.changeBrandBtn.disabled = !brandKey;
        }
        this.updateBrandConfirmState();
    }

    resetBrandTheme() {
        const accent = this.defaultAccent || '#EA7946';
        document.documentElement.style.setProperty('--brand-accent', accent);

        if (this.dom.catalogBrandLogo) {
            this.dom.catalogBrandLogo.hidden = true;
            this.dom.catalogBrandLogo.removeAttribute('src');
        }

        if (this.dom.catalogBrandName) {
            this.dom.catalogBrandName.textContent = 'Select a brand to continue';
        }

        if (this.dom.changeBrandBtn) {
            this.dom.changeBrandBtn.disabled = true;
        }
        this.updateBrandConfirmState();
    }

    async handleLogin(event) {
        event.preventDefault();

        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value.trim();

        if (!username || !password) {
            this.showNotification('Please enter both username and password', 'error');
            return;
        }

        try {
            let admin = await this.authenticateSampleAdmin(username, password);

            if (!admin) {
                admin = await this.attemptSupabaseLogin(username, password);
            }

            if (admin) {
                this.currentUser = admin;
                this.updateUIAfterLogin();
                if (event.target && typeof event.target.reset === 'function') {
                    event.target.reset();
                }
                this.showNotification('Login successful! Select a brand to continue.', 'success');
                if (window.localStorage) {
                    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(admin));
                }
                this.showPage('catalog-page');
            } else {
                this.showNotification('Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    async authenticateSampleAdmin(username, password) {
        if (typeof SAMPLE_ADMINS === 'undefined' || !Array.isArray(SAMPLE_ADMINS)) {
            return null;
        }

        const candidate = SAMPLE_ADMINS.find(item => item?.username === username);
        if (!candidate) {
            return null;
        }

        const storedSecret = candidate.password_hash || candidate.password;
        if (!storedSecret) {
            return null;
        }

        const isValid = await this.verifyPassword(password, storedSecret);
        if (!isValid) {
            return null;
        }

        return this.sanitizeUser(candidate);
    }

    async attemptSupabaseLogin(username, password) {
        try {
            const client = await this.ensureSupabaseClient();
            if (!client) {
                return null;
            }

            const tableName = (typeof TABLES !== 'undefined' && TABLES.ADMIN_USERS) ? TABLES.ADMIN_USERS : 'admin_users';
            const { data, error } = await this.runWithRetry(
                () => client
                    .from(tableName)
                    .select('id, username, full_name, signature_url, password_hash')
                    .eq('username', username)
                    .maybeSingle(),
                { retries: 1, timeoutMs: 8000, backoffMs: 600 }
            );

            if (error) {
                console.warn('Supabase login error:', error);
                return null;
            }

            if (!data) {
                return null;
            }

            const storedSecret = data.password_hash;
            const isValid = await this.verifyPassword(password, storedSecret);
            if (!isValid) {
                return null;
            }

            return this.sanitizeUser(data);
        } catch (error) {
            console.warn('Supabase login exception:', error);
            return null;
        }
    }

    sanitizeUser(user) {
        if (!user || typeof user !== 'object') {
            return null;
        }

        const { password, password_hash, ...rest } = user;
        return { ...rest };
    }

    async verifyPassword(inputPassword, storedValue) {
        if (!storedValue || typeof storedValue !== 'string') {
            return false;
        }

        if (storedValue === inputPassword) {
            return true;
        }

        if (this.isBcryptHash(storedValue)) {
            const bcryptLib = this.getBcryptLib();
            if (!bcryptLib) {
                console.warn('Bcrypt library unavailable while verifying password.');
                return false;
            }

            try {
                if (typeof bcryptLib.compare === 'function') {
                    return await new Promise(resolve => {
                        bcryptLib.compare(inputPassword, storedValue, (err, result) => {
                            if (err) {
                                console.warn('Bcrypt comparison error:', err);
                                resolve(false);
                            } else {
                                resolve(Boolean(result));
                            }
                        });
                    });
                }

                if (typeof bcryptLib.compareSync === 'function') {
                    return bcryptLib.compareSync(inputPassword, storedValue);
                }
            } catch (error) {
                console.warn('Bcrypt compare failed:', error);
                return false;
            }
        }

        if (this.looksLikeSha256(storedValue)) {
            try {
                const hashed = await this.hashSha256Hex(inputPassword);
                return hashed === storedValue.toLowerCase();
            } catch (error) {
                console.warn('SHA-256 comparison failed:', error);
                return false;
            }
        }

        return false;
    }

    getBcryptLib() {
        if (typeof window === 'undefined') {
            return null;
        }

        if (window.dcodeIO?.bcrypt) {
            return window.dcodeIO.bcrypt;
        }

        if (window.bcrypt) {
            return window.bcrypt;
        }

        return null;
    }

    isBcryptHash(value) {
        return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
    }

    looksLikeSha256(value) {
        return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
    }

    async hashSha256Hex(input) {
        if (typeof window === 'undefined' || !window.crypto?.subtle || typeof TextEncoder === 'undefined') {
            throw new Error('Web Crypto API not available for SHA-256 hashing');
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    delay(durationMs = 300) {
        return new Promise(resolve => setTimeout(resolve, durationMs));
    }

    async withTimeout(promise, timeoutMs = 8000, timeoutMessage = 'Request timed out') {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async runWithRetry(factory, { retries = 1, timeoutMs = 8000, backoffMs = 400 } = {}) {
        let lastError = null;

        for (let attempt = 0; attempt <= retries; attempt += 1) {
            try {
                return await this.withTimeout(factory(), timeoutMs);
            } catch (error) {
                lastError = error;
                if (attempt === retries) {
                    break;
                }
                await this.delay(backoffMs * (attempt + 1));
            }
        }

        throw lastError;
    }

    async ensureSupabaseClient() {
        if (this.supabaseClient) {
            return this.supabaseClient;
        }

        if (!this.supabaseClientPromise) {
            if (typeof window !== 'undefined' && typeof window.getSupabaseClient === 'function') {
                this.supabaseClientPromise = window.getSupabaseClient()
                    .then(client => {
                        this.supabaseClient = client || null;
                        return this.supabaseClient;
                    })
                    .catch(error => {
                        console.warn('Supabase client initialization failed:', error);
                        this.supabaseClient = null;
                        return null;
                    })
                    .finally(() => {
                        this.supabaseClientPromise = null;
                    });
            } else {
                return null;
            }
        }

        return this.supabaseClientPromise;
    }

    updateUIAfterLogin() {
        if (this.dom.navUser) {
            this.dom.navUser.style.display = 'flex';
        }

        if (this.dom.userName && this.currentUser) {
            this.dom.userName.textContent = this.currentUser.full_name || this.currentUser.username || 'Admin';
        }

        this.pendingBrand = this.selectedBrand || null;
        this.populateBrandOptions();

        if (this.selectedBrand) {
            this.applyBrandTheme(this.selectedBrand);
        } else {
            this.openBrandModal();
        }
    }

    handleLogout() {
        this.currentUser = null;
        if (window.localStorage) {
            localStorage.removeItem(USER_STORAGE_KEY);
        }
        if (this.dom.navUser) {
            this.dom.navUser.style.display = 'none';
        }
        this.clearDraft();
        this.resetFlow({ preserveUser: false });
        this.resetBrandTheme();
        this.pendingBrand = null;
        this.showBrandModal(false);
        this.showNotification('Logged out successfully', 'info');
    }


    async startEstimation(forceReload = true) {
        if (!this.currentUser) {
            this.showNotification('Please login first', 'error');
            return;
        }

        if (!this.selectedBrand) {
            this.openBrandModal();
            return;
        }

        this.pendingBrand = this.selectedBrand;
        this.updateBrandConfirmState();

        await this.ensureProductsLoaded(forceReload);
        this.showPage('catalog-page');
    }

    async ensureProductsLoaded(force = false) {
        const brand = this.selectedBrand;
        if (!brand) {
            return;
        }

        const hasCachedProducts = Object.keys(this.activeProducts || {}).length > 0;
        if (!force && this.currentCatalogBrand === brand && hasCachedProducts) {
            this.updateCategoryAvailability();
            this.showCategory(this.activeCategory, { silent: this.isRestoring });
            return;
        }

        const groupedProducts = await this.loadProductsForBrand(brand);
        const hasProducts = Object.values(groupedProducts).some(list => Array.isArray(list) && list.length);

        if (!hasProducts) {
            this.activeProducts = {};
            this.currentCatalogBrand = '';
            this.handleProductsUnavailable();
            return;
        }

        this.activeProducts = groupedProducts;
        this.currentCatalogBrand = brand;
        this.activeCategory = this.findFirstCategoryWithProducts() || 'panels';
        this.updateCategoryAvailability();
        this.showCategory(this.activeCategory, { silent: this.isRestoring });
        if (this.dom.productsEmptyState) {
            this.dom.productsEmptyState.hidden = true;
        }
    }

    async loadProductsForBrand(brand) {
        const supabaseProducts = await this.fetchProductsFromSupabase(brand) || [];
        const fallbackProducts = await this.loadFallbackProducts();
        const fallbackList = fallbackProducts && fallbackProducts[brand] && Array.isArray(fallbackProducts[brand])
            ? fallbackProducts[brand]
            : [];

        let items = Array.isArray(supabaseProducts) ? [...supabaseProducts] : [];

        if (items.length && fallbackList.length) {
            items = this.mergeProductLists(items, fallbackList);
        } else if (!items.length && fallbackList.length) {
            items = fallbackList;
        }

        if (!items.length) {
            return {};
        }

        return this.groupProductsByCategory(items, brand);
    }

    async fetchProductsFromSupabase(brand) {
        const client = await this.ensureSupabaseClient();
        if (!client) {
            return null;
        }

        const tableName = (typeof TABLES !== 'undefined' && TABLES.PRODUCTS) ? TABLES.PRODUCTS : 'products';

        try {
            const { data, error } = await this.runWithRetry(
                () => client
                    .from(tableName)
                    .select('*')
                    .eq('brand', brand)
                    .eq('is_active', true)
                    .order('category', { ascending: true })
                    .order('name', { ascending: true }),
                { retries: 1, timeoutMs: 8000, backoffMs: 600 }
            );

            if (error) {
                console.warn('Supabase product load error:', error);
                return null;
            }

            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.warn('Supabase product load exception:', error);
            return null;
        }
    }

    async loadFallbackProducts() {
        if (this.fallbackProducts) {
            return this.fallbackProducts;
        }

        if (typeof window !== 'undefined' && window.PRODUCT_SNAPSHOT) {
            this.fallbackProducts = window.PRODUCT_SNAPSHOT;
            return this.fallbackProducts;
        }

        if (!this.fallbackProductsUrl) {
            return null;
        }

        try {
            const response = await fetch(this.fallbackProductsUrl, { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            this.fallbackProducts = Array.isArray(data) ? data.reduce((acc, item) => {
                const key = (item.brand || '').toLowerCase();
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(item);
                return acc;
            }, {}) : data;
            return this.fallbackProducts;
        } catch (error) {
            console.warn('Fallback product load error:', error);
            this.fallbackProducts = {};
            return this.fallbackProducts;
        }
    }

    groupProductsByCategory(items, brand) {
        const grouped = {};
        if (!Array.isArray(items)) {
            return grouped;
        }

        items.forEach((product, index) => {
            const category = (product.category || 'misc').toLowerCase();
            if (!grouped[category]) {
                grouped[category] = [];
            }

            const brandKey = (product.brand || brand || '').toLowerCase();
            const normalized = {
                id: product.id || `${brandKey}-${category}-${index}`,
                name: product.name || 'Unnamed product',
                description: product.description || '',
                category,
                brand: brandKey,
                colors: Array.isArray(product.colors) ? product.colors : [],
                protocols: Array.isArray(product.protocols) ? product.protocols : [],
                price: Number(product.price) || 0,
                image_url: product.image_url || this.getFallbackProductImage(brandKey)
            };

            grouped[category].push(normalized);
        });

        return grouped;
    }

    mergeProductLists(primary, fallback) {
        const primaryList = Array.isArray(primary) ? [...primary] : [];
        const fallbackList = Array.isArray(fallback) ? fallback : [];
        const map = new Map();

        primaryList.forEach(item => {
            map.set(this.buildProductKey(item), item);
        });

        fallbackList.forEach(item => {
            const key = this.buildProductKey(item);
            if (!map.has(key)) {
                map.set(key, item);
            }
        });

        return Array.from(map.values());
    }

    buildProductKey(product) {
        const category = (product.category || '').toLowerCase();
        const name = (product.name || '').toLowerCase();
        return `${category}::${name}`;
    }

    findFirstCategoryWithProducts() {
        if (!this.activeProducts) {
            return null;
        }
        return Object.keys(this.activeProducts).find(category => Array.isArray(this.activeProducts[category]) && this.activeProducts[category].length) || null;
    }

    updateCategoryAvailability() {
        if (!this.dom.categoryTabs || !this.dom.categoryTabs.length) {
            return;
        }
        this.dom.categoryTabs.forEach(tab => {
            const category = tab.dataset.category;
            const hasProducts = Array.isArray(this.activeProducts?.[category]) && this.activeProducts[category].length > 0;
            tab.disabled = !hasProducts;
            tab.classList.toggle('disabled', !hasProducts);
        });
    }

    handleProductsUnavailable() {
        if (this.dom.productsGrid) {
            this.dom.productsGrid.innerHTML = '';
        }
        if (this.dom.productsEmptyState) {
            this.dom.productsEmptyState.hidden = false;
        }
        this.resetSelectionsForBrandChange();
        this.pendingBrand = null;
        this.updateBrandConfirmState();
        this.showNotification('No products available for the selected brand yet.', 'warning');
        this.openBrandModal();
    }

    getFallbackProductImage(brand) {
        const brandConfig = this.brandMeta?.[brand];
        if (brandConfig?.websiteLogo) {
            return brandConfig.websiteLogo;
        }
        if (this.documentAssets?.headerLogo) {
            return this.documentAssets.headerLogo;
        }
        return 'zuccess_logo_in_website.png';
    }

    showCategory(category, { silent = false } = {}) {
        if (!this.dom.productsGrid) {
            return;
        }

        const categoryProducts = (this.activeProducts && this.activeProducts[category]) || [];
        this.activeCategory = category;

        if (this.dom.categoryTabs.length) {
            this.dom.categoryTabs.forEach(tab => {
                const isActive = tab.dataset.category === category;
                tab.classList.toggle('active', isActive);
            });
        }

        this.dom.productsGrid.innerHTML = '';

        if (!categoryProducts.length) {
            if (this.dom.productsEmptyState) {
                this.dom.productsEmptyState.hidden = false;
            }
        } else {
            if (this.dom.productsEmptyState) {
                this.dom.productsEmptyState.hidden = true;
            }
            categoryProducts.forEach(product => {
                const card = this.createProductCard(product);
                this.dom.productsGrid.appendChild(card);
            });
        }

        if (!silent) {
            this.updateSelectedSummary({ animate: false });
        }
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product.id;
        card.dataset.brand = product.brand || '';

        const colors = Array.isArray(product.colors) && product.colors.length ? product.colors : ['Standard'];
        const protocols = Array.isArray(product.protocols) && product.protocols.length ? product.protocols : ['Default'];

        card.innerHTML = `
            <div class="product-image">
                <img src="${product.image_url}" alt="${product.name}" class="product-thumb">
            </div>
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description || ''}</p>
            <div class="product-controls">
                <div class="control-group">
                    <label>Color:</label>
                    <select class="product-color" data-product-id="${product.id}">
                        ${colors.map(color => `<option value="${color}">${color}</option>`).join('')}
                    </select>
                </div>
                <div class="control-group">
                    <label>Protocol:</label>
                    <select class="product-protocol" data-product-id="${product.id}">
                        ${protocols.map(protocol => `<option value="${protocol}">${protocol}</option>`).join('')}
                    </select>
                </div>
                <div class="control-group">
                    <label>Quantity:</label>
                    <div class="quantity-controls">
                        <button class="quantity-btn minus-btn" type="button">-</button>
                        <input type="number" class="quantity-input" value="0" min="0" data-product-id="${product.id}">
                        <button class="quantity-btn plus-btn" type="button">+</button>
                    </div>
                </div>
                <div class="quantity-status" id="quantity-status-${product.id}">
                    <span class="quantity-badge">Selected: <span class="quantity-number">0</span></span>
                </div>
            </div>
            <div class="product-price">
                <span class="price-info">Unit: AED ${product.price.toFixed(2)}</span>
                <span class="price-total" data-product-id="${product.id}">AED 0.00</span>
            </div>
        `;

        const quantityInput = card.querySelector('.quantity-input');
        const plusBtn = card.querySelector('.plus-btn');
        const minusBtn = card.querySelector('.minus-btn');
        const colorSelect = card.querySelector('.product-color');
        const protocolSelect = card.querySelector('.product-protocol');

        const existingSelection = this.getExistingSelection(product.id);
        if (existingSelection) {
            if (colorSelect && existingSelection.selectedColor) {
                colorSelect.value = existingSelection.selectedColor;
            }
            if (protocolSelect && existingSelection.selectedProtocol) {
                protocolSelect.value = existingSelection.selectedProtocol;
            }
            quantityInput.value = existingSelection.quantity;
            this.applySelectionState(card, existingSelection.quantity, product.price, { silent: true });
        }

        quantityInput.addEventListener('change', () => {
            const newQuantity = Math.max(0, parseInt(quantityInput.value, 10) || 0);
            quantityInput.value = newQuantity;
            this.updateProductQuantity(product.id, newQuantity);
        });

        plusBtn.addEventListener('click', event => {
            event.preventDefault();
            const currentValue = parseInt(quantityInput.value, 10) || 0;
            const newValue = currentValue + 1;
            quantityInput.value = newValue;
            this.updateProductQuantity(product.id, newValue);
        });

        minusBtn.addEventListener('click', event => {
            event.preventDefault();
            const currentValue = parseInt(quantityInput.value, 10) || 0;
            const newValue = Math.max(0, currentValue - 1);
            quantityInput.value = newValue;
            this.updateProductQuantity(product.id, newValue);
        });

        const handleOptionChange = () => {
            this.updateProductOptions(product.id, {
                selectedColor: colorSelect ? colorSelect.value : '',
                selectedProtocol: protocolSelect ? protocolSelect.value : ''
            });
        };

        if (colorSelect) {
            colorSelect.addEventListener('change', handleOptionChange);
        }

        if (protocolSelect) {
            protocolSelect.addEventListener('change', handleOptionChange);
        }

        return card;
    }

    updateProductQuantity(productId, quantity, { silent = false } = {}) {
        const product = this.findProductById(productId);
        if (!product) {
            return;
        }

        const options = this.getSelectionOptionsFromDom(productId);
        const existingIndex = this.selectedProducts.findIndex(item => item.id === productId);
        const previousQuantity = existingIndex >= 0 ? this.selectedProducts[existingIndex].quantity : 0;

        if (quantity > 0) {
            const productData = {
                ...product,
                selectedColor: options.selectedColor,
                selectedProtocol: options.selectedProtocol,
                quantity,
                subtotal: product.price * quantity
            };

            if (existingIndex >= 0) {
                this.selectedProducts[existingIndex] = productData;
            } else {
                this.selectedProducts.push(productData);
            }
        } else if (existingIndex >= 0) {
            this.selectedProducts.splice(existingIndex, 1);
        }

        this.updateProductDisplay(productId, quantity, product.price, previousQuantity, { silent });
        this.updateProductSelectionState(productId, quantity > 0, quantity, { silent });
        this.updateQuotationData();
        this.updateSelectedSummary();
        this.persistDraft();
    }

    getSelectionOptionsFromDom(productId) {
        const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
        const existing = this.getExistingSelection(productId) || {};

        if (!card) {
            return {
                selectedColor: existing.selectedColor || '',
                selectedProtocol: existing.selectedProtocol || ''
            };
        }

        const colorSelect = card.querySelector('.product-color');
        const protocolSelect = card.querySelector('.product-protocol');

        return {
            selectedColor: colorSelect ? colorSelect.value : (existing.selectedColor || ''),
            selectedProtocol: protocolSelect ? protocolSelect.value : (existing.selectedProtocol || '')
        };
    }

    getExistingSelection(productId) {
        if (!Array.isArray(this.selectedProducts)) {
            return null;
        }

        const match = this.selectedProducts.find(item => item.id === productId);
        if (!match) {
            return null;
        }

        return {
            ...match,
            selectedColor: match.selectedColor || '',
            selectedProtocol: match.selectedProtocol || '',
            quantity: Number(match.quantity) || 0,
            subtotal: Number(match.subtotal) || 0
        };
    }

    updateProductSelectionState(productId, isSelected, quantity = 0, { silent = false } = {}) {
        const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
        if (!card) {
            return;
        }
        this.applySelectionState(card, quantity, this.findProductById(productId)?.price || 0, { silent });
    }

    applySelectionState(card, quantity, price = 0, { silent = false } = {}) {
        if (!card) {
            return;
        }

        const normalizedQuantity = Number(quantity) || 0;
        const hasQuantity = normalizedQuantity > 0;

        card.classList.toggle('selected', hasQuantity);

        const quantityInput = card.querySelector('.quantity-input');
        if (quantityInput) {
            quantityInput.value = normalizedQuantity;
        }

        const minusBtn = card.querySelector('.minus-btn');
        if (minusBtn) {
            minusBtn.disabled = !hasQuantity;
        }

        const quantityStatus = card.querySelector('.quantity-status');
        if (quantityStatus) {
            quantityStatus.classList.toggle('visible', hasQuantity);
        }

        const quantityNumber = card.querySelector('.quantity-number');
        if (quantityNumber) {
            quantityNumber.textContent = normalizedQuantity;
        }

        const priceTotal = card.querySelector('.price-total');
        if (priceTotal) {
            const total = (Number(price) || 0) * normalizedQuantity;
            priceTotal.textContent = 'AED ' + total.toFixed(2);
            priceTotal.classList.remove('updating', 'decreasing');

            const indicator = priceTotal.parentElement?.querySelector('.price-change-indicator');
            if (indicator && indicator.parentElement) {
                indicator.parentElement.removeChild(indicator);
            }
        }
    }

    findProductById(productId) {
        if (!this.activeProducts) {
            return null;
        }
        for (const category of Object.keys(this.activeProducts)) {
            const product = this.activeProducts[category]?.find(item => item.id === productId);
            if (product) {
                return product;
            }
        }
        return null;
    }

    updateProductDisplay(productId, quantity, price, previousQuantity = 0, { silent = false } = {}) {
        const totalElement = document.querySelector(`.price-total[data-product-id="${productId}"]`);
        const quantityNumber = document.querySelector(`#quantity-status-${productId} .quantity-number`);

        if (totalElement) {
            const newTotal = price * quantity;
            totalElement.textContent = `AED ${newTotal.toFixed(2)}`;

            totalElement.classList.remove('updating', 'decreasing');
            const existingIndicator = totalElement.parentElement?.querySelector('.price-change-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }

            if (!silent) {
                if (quantity > previousQuantity) {
                    totalElement.classList.add('updating');
                    this.showPriceChangeIndicator(totalElement, '+', 'increase');
                } else if (quantity < previousQuantity && quantity > 0) {
                    totalElement.classList.add('decreasing');
                    this.showPriceChangeIndicator(totalElement, '-', 'decrease');
                }

                setTimeout(() => {
                    totalElement.classList.remove('updating', 'decreasing');
                }, 600);
            }
        }

        if (quantityNumber) {
            quantityNumber.textContent = quantity;
        }
    }

    showPriceChangeIndicator(element, symbol, type) {
        const indicator = document.createElement('span');
        indicator.className = `price-change-indicator ${type}`;
        indicator.textContent = symbol;

        const container = element.parentElement;
        if (container) {
            if (window.getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
            }
            container.appendChild(indicator);

            requestAnimationFrame(() => {
                indicator.classList.add('show');
            });

            setTimeout(() => {
                if (indicator.parentElement) {
                    indicator.parentElement.removeChild(indicator);
                }
            }, 1000);
        }
    }

    updateQuotationData() {
        this.quotationData.products = this.selectedProducts.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            quantity: product.quantity,
            subtotal: product.subtotal,
            selectedColor: product.selectedColor || '',
            selectedProtocol: product.selectedProtocol || ''
        }));
    }

    updateSelectedSummary({ animate = true } = {}) {
        if (!this.dom.selectedSummary || !this.dom.selectedCount || !this.dom.selectedTotal) {
            return;
        }

        const totalItems = this.selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
        const totalAmount = this.selectedProducts.reduce((sum, product) => sum + product.subtotal, 0);

        if (totalItems > 0) {
            this.dom.selectedSummary.style.display = 'block';
            this.dom.selectedCount.textContent = totalItems;
            this.dom.selectedTotal.textContent = `AED ${totalAmount.toFixed(2)}`;
            if (animate) {
                this.animateElement(this.dom.selectedSummary, 'pulse');
            }
        } else {
            this.dom.selectedSummary.style.display = 'none';
        }

        return { totalItems, totalAmount };
    }

    animateElement(element, className) {
        if (!element) {
            return;
        }
        element.classList.remove(className);
        void element.offsetWidth;
        element.classList.add(className);
        setTimeout(() => element.classList.remove(className), 400);
    }

    handleCategoryChange(event) {
        const category = event.currentTarget?.dataset.category;
        if (!category) {
            return;
        }
        this.showCategory(category);
    }

    goToLaborPage() {
        if (this.selectedProducts.length === 0) {
            this.showNotification('Please select at least one product', 'error');
            return;
        }
        this.updateLaborPageDisplay();
        this.calculateTotal({ silent: true });
        this.showPage('labor-page');
    }

    updateLaborPageDisplay() {
        if (this.dom.productsTotal) {
            const productsTotal = this.selectedProducts.reduce((sum, product) => sum + product.subtotal, 0);
            this.dom.productsTotal.textContent = `AED ${productsTotal.toFixed(2)}`;
        }
    }

    collectLaborInputs() {
        const workDays = parseInt(this.dom.workDaysInput?.value, 10) || 0;
        const programmingFee = parseFloat(this.dom.programmingInput?.value) || 0;
        const installationFee = parseFloat(this.dom.installationInput?.value) || 0;
        const discountInput = (this.dom.discountInput?.value || '').trim();

        const productsTotal = this.selectedProducts.reduce((sum, product) => sum + product.subtotal, 0);
        const laborSubtotal = programmingFee + installationFee;
        const subtotal = productsTotal + laborSubtotal;

        let discountValue = 0;
        if (discountInput) {
            if (discountInput.includes('%')) {
                const percentage = parseFloat(discountInput.replace('%', ''));
                if (!Number.isNaN(percentage)) {
                    discountValue = subtotal * (percentage / 100);
                }
            } else {
                const numericDiscount = parseFloat(discountInput);
                if (!Number.isNaN(numericDiscount)) {
                    discountValue = numericDiscount;
                }
            }
        }

        const appliedDiscount = Math.min(Math.max(discountValue, 0), subtotal);
        const grandTotal = Math.max(subtotal - appliedDiscount, 0);

        this.quotationData.labor = {
            days: workDays,
            programmingFee,
            installationFee,
            discount: appliedDiscount,
            discountInput
        };
        this.quotationData.total = grandTotal;

        return { workDays, programmingFee, installationFee, discount: appliedDiscount, productsTotal, grandTotal };
    }

    calculateTotal({ silent = false } = {}) {
        const { programmingFee, installationFee, discount, grandTotal } = this.collectLaborInputs();

        const previousTotal = parseFloat(this.dom.grandTotal?.dataset.previousTotal || '0');
        this.updateLaborDisplay(installationFee, programmingFee, discount, grandTotal, previousTotal, { silent });

        if (this.dom.grandTotal) {
            this.dom.grandTotal.dataset.previousTotal = grandTotal;
        }

        this.persistDraft();
        return grandTotal;
    }

    updateLaborDisplay(installationFee, programmingFee, discount, grandTotal, previousTotal, { silent = false } = {}) {
        if (this.dom.installationTotal) {
            this.dom.installationTotal.textContent = `AED ${installationFee.toFixed(2)}`;
        }
        if (this.dom.programmingTotal) {
            this.dom.programmingTotal.textContent = `AED ${programmingFee.toFixed(2)}`;
        }
        if (this.dom.discountTotal) {
            this.dom.discountTotal.textContent = `-AED ${discount.toFixed(2)}`;
        }
        if (this.dom.grandTotal) {
            this.dom.grandTotal.textContent = `AED ${grandTotal.toFixed(2)}`;
            if (!silent) {
                this.dom.grandTotal.classList.remove('updating', 'decreasing');
                if (grandTotal > previousTotal) {
                    this.dom.grandTotal.classList.add('updating');
                    this.showPriceChangeIndicator(this.dom.grandTotal, '+', 'increase');
                } else if (grandTotal < previousTotal) {
                    this.dom.grandTotal.classList.add('decreasing');
                    this.showPriceChangeIndicator(this.dom.grandTotal, '-', 'decrease');
                }
                setTimeout(() => {
                    this.dom.grandTotal.classList.remove('updating', 'decreasing');
                }, 600);
            }
        }
    }

    goToCustomerPage() {
        this.calculateTotal({ silent: true });
        this.showPage('customer-page');
    }

    handleCustomerFieldInput() {
        this.collectCustomerInputs({ silent: true });
        this.persistDraft();
    }

    collectCustomerInputs({ silent = false } = {}) {
        const customer = {
            name: this.dom.customerName?.value.trim() || '',
            phone: this.dom.customerPhone?.value.trim() || '',
            location: this.dom.customerLocation?.value.trim() || '',
            notes: this.dom.customerNotes?.value.trim() || ''
        };

        this.quotationData.customer = customer;

        if (!silent) {
            this.persistDraft();
        }

        return customer;
    }

    handleReviewRequest() {
        if (!this.selectedProducts.length) {
            this.showNotification('Please select at least one product before continuing', 'error');
            this.showPage('catalog-page');
            return;
        }

        const customer = this.collectCustomerInputs();
        if (!customer.name || !customer.phone || !customer.location) {
            this.showNotification('Please fill in all required customer fields', 'error');
            return;
        }

        this.calculateTotal({ silent: true });
        this.populateReviewModal();
        this.toggleReviewModal(true);
    }

    populateReviewModal() {
        if (!this.dom.reviewProducts || !this.dom.reviewLabor || !this.dom.reviewCustomer) {
            return;
        }

        const productsTotal = this.selectedProducts.reduce((sum, product) => sum + product.subtotal, 0);
        if (this.selectedProducts.length) {
            const itemsHtml = this.selectedProducts.map(product => {
                const optionParts = [];
                if (product.selectedColor) {
                    optionParts.push(`Color: ${product.selectedColor}`);
                }
                if (product.selectedProtocol) {
                    optionParts.push(`Protocol: ${product.selectedProtocol}`);
                }
                const optionsHtml = optionParts.length ? `<div class="review-note">${optionParts.join(' | ')}</div>` : '';
                return `
                    <li>
                        <div class="review-row">
                            <span><strong>${product.quantity}x</strong> ${product.name}</span>
                            <span>AED ${product.subtotal.toFixed(2)}</span>
                        </div>
                        ${optionsHtml}
                    </li>
                `;
            }).join('');
            this.dom.reviewProducts.innerHTML = `
                <ul>${itemsHtml}</ul>
                <div class="review-total-row">
                    <span>Products total</span>
                    <span>AED ${productsTotal.toFixed(2)}</span>
                </div>
            `;
        } else {
            this.dom.reviewProducts.innerHTML = '<p>No products selected.</p>';
        }

        const labor = this.quotationData.labor;
        this.dom.reviewLabor.innerHTML = `
            <ul>
                <li>
                    <div class="review-row">
                        <span>Estimated work days</span>
                        <span>${labor.days || 0}</span>
                    </div>
                </li>
                <li>
                    <div class="review-row">
                        <span>Programming fee</span>
                        <span>AED ${labor.programmingFee.toFixed(2)}</span>
                    </div>
                </li>
                <li>
                    <div class="review-row">
                        <span>Installation fee</span>
                        <span>AED ${labor.installationFee.toFixed(2)}</span>
                    </div>
                </li>
                <li>
                    <div class="review-row">
                        <span>Discount</span>
                        <span>-AED ${labor.discount.toFixed(2)}</span>
                    </div>
                    ${labor.discountInput ? `<div class="review-note">Input: ${labor.discountInput}</div>` : ''}
                </li>
                <li>
                    <div class="review-row">
                        <strong>Grand total</strong>
                        <strong>AED ${this.quotationData.total.toFixed(2)}</strong>
                    </div>
                </li>
            </ul>
        `;

        const customerData = this.quotationData.customer;
        this.dom.reviewCustomer.innerHTML = `
            <ul>
                <li>
                    <div class="review-row">
                        <span>Name</span>
                        <span>${customerData.name}</span>
                    </div>
                </li>
                <li>
                    <div class="review-row">
                        <span>Phone</span>
                        <span>${customerData.phone}</span>
                    </div>
                </li>
                <li>
                    <div class="review-row">
                        <span>Location</span>
                        <span>${customerData.location}</span>
                    </div>
                </li>
                <li>
                    <div class="review-row">
                        <span>Notes</span>
                        <span>${customerData.notes || 'N/A'}</span>
                    </div>
                </li>
            </ul>
        `;
    }

    toggleReviewModal(show) {
        if (!this.dom.reviewModal) {
            return;
        }
        this.dom.reviewModal.classList.toggle('active', show);
    }

    handleReviewModalClick(event) {
        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) {
            return;
        }

        const action = actionTarget.dataset.action;
        if (!action) {
            return;
        }

        event.preventDefault();

        switch (action) {
            case 'close-modal':
                this.toggleReviewModal(false);
                break;
            case 'edit-products':
                this.toggleReviewModal(false);
                this.showPage('catalog-page');
                break;
            case 'edit-labor':
                this.toggleReviewModal(false);
                this.showPage('labor-page');
                break;
            default:
                break;
        }
    }

    async finalizeQuotation() {
        if (this.isGenerating) {
            return;
        }

        if (!this.selectedProducts.length) {
            this.showNotification('Please add products before generating a quotation', 'error');
            this.toggleReviewModal(false);
            this.showPage('catalog-page');
            return;
        }

        const customer = this.quotationData.customer;
        if (!customer.name || !customer.phone || !customer.location) {
            this.showNotification('Customer information is incomplete', 'error');
            this.toggleReviewModal(false);
            this.showPage('customer-page');
            return;
        }

        this.isGenerating = true;
        this.toggleReviewModal(false);
        this.calculateTotal({ silent: true });

        const quotationNumber = 'QTN-' + Date.now().toString().slice(-6);

        try {
            await this.generatePDF(quotationNumber);
            const saveResult = await this.saveQuotation(quotationNumber);

            if (saveResult?.success) {
                this.showNotification('Quotation PDF downloaded. Quotation saved.', 'success');
                this.clearDraft();
                this.resetFlow({ preserveUser: true });
            } else {
                this.showNotification('PDF downloaded. Supabase unreachable; data kept locally for retry.', 'warning');
            }
        } catch (error) {
            console.error('Error generating quotation PDF:', error);
            const message = error?.message || 'Error generating quotation PDF. Please try again.';
            this.showNotification(message, 'error');
        } finally {
            this.isGenerating = false;
        }
    }

    async generatePDF(quotationNumber) {
        const quotationHTML = this.createQuotationHTML(quotationNumber);

        // Ensure html2pdf is available
        if (typeof window.html2pdf === 'undefined') {
            throw new Error('PDF library not loaded. Please check your internet connection.');
        }

        // Parse the HTML string into a Document and extract the content + styles
        const parsed = new DOMParser().parseFromString(quotationHTML, 'text/html');
        const shell = parsed.querySelector('.document-shell');
        const styleEl = parsed.querySelector('style');
        if (!shell) {
            throw new Error('Unable to prepare document for PDF');
        }

        // Render into a hidden container to convert to PDF
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-99999px';
        container.style.top = '0';
        container.style.width = '800px';
        container.style.background = '#fff';

        if (styleEl && styleEl.textContent) {
            const inlineStyle = document.createElement('style');
            inlineStyle.textContent = styleEl.textContent;
            container.appendChild(inlineStyle);
        }
        container.appendChild(shell);
        document.body.appendChild(container);

        const element = shell;

        const opt = {
            margin:       [10, 10, 10, 10],
            filename:     `${quotationNumber}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['css', 'legacy'], avoid: ['.avoid-break', '.no-break', '.signature-card', 'tr'] }
        };

        try {
            await window.html2pdf().set(opt).from(element).save();
        } finally {
            // Cleanup container
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }
    }

    createQuotationHTML(quotationNumber) {
        const escapeHtml = (value) => {
            if (value === null || value === undefined) {
                return '';
            }
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        const formatCurrency = (value) => 'AED ' + Number(value || 0).toFixed(2);
        const formatDiscount = (value) => value > 0 ? '-AED ' + Number(value).toFixed(2) : 'AED 0.00';

        const currentDate = new Date().toLocaleDateString('en-GB');
        const productsTotal = this.selectedProducts.reduce((sum, product) => sum + (Number(product.subtotal) || 0), 0);

        const brandDetails = this.brandMeta?.[this.selectedBrand] || null;
        const brandLabelRaw = brandDetails?.label || (this.selectedBrand ? this.selectedBrand.toUpperCase() : 'Catalogue');
        const headerLogoRaw = this.documentAssets?.headerLogo || 'zuccess_logo_in_document.png';
        const brandLogoRaw = brandDetails?.documentLogo || brandDetails?.websiteLogo || headerLogoRaw;
        const stampLogoRaw = this.documentAssets?.stamp || 'Zuccess%20Stamp.png';

        const workDays = Number(this.quotationData?.labor?.days) || 0;
        const programmingFee = Number(this.quotationData?.labor?.programmingFee) || 0;
        const installationFee = Number(this.quotationData?.labor?.installationFee) || 0;
        const discountValue = Number(this.quotationData?.labor?.discount) || 0;
        const totalAmount = Number(this.quotationData?.total) || 0;

        const customer = this.quotationData.customer || {};
        const customerName = escapeHtml(customer.name || '');
        const customerPhone = escapeHtml(customer.phone || '');
        const customerLocationHtml = escapeHtml(customer.location || '').replace(/\n/g, '<br>');
        const customerNotesRaw = escapeHtml(customer.notes || '');
        const customerNotes = customerNotesRaw ? customerNotesRaw.replace(/\n/g, '<br>') : '';

        const preparedBy = escapeHtml(this.currentUser?.full_name || 'Zuccess Team');
        const brandLabel = escapeHtml(brandLabelRaw);
        const headerLogo = escapeHtml(headerLogoRaw);
        const brandLogo = escapeHtml(brandLogoRaw);
        const stampLogo = escapeHtml(stampLogoRaw);
        const quotationNumberSafe = escapeHtml(quotationNumber);

        const workDaysDisplay = workDays > 0 ? `${workDays} day${workDays === 1 ? '' : 's'}` : 'Not specified';
        const customerNameDisplay = customerName || 'N/A';
        const customerPhoneDisplay = customerPhone || 'N/A';
        const locationDisplay = customerLocationHtml || 'N/A';

        const productsRows = this.selectedProducts.map((product, index) => {
            const safeName = escapeHtml(product.name || '');
            const safeDescription = escapeHtml(product.description || '');
            const descriptionHtml = safeDescription ? safeDescription.replace(/\n/g, '<br>') : '';
            const optionParts = [];
            if (product.selectedColor) {
                optionParts.push(`Color: ${escapeHtml(product.selectedColor)}`);
            }
            if (product.selectedProtocol) {
                optionParts.push(`Protocol: ${escapeHtml(product.selectedProtocol)}`);
            }
            const optionsText = optionParts.length ? `<div class="item-options">${optionParts.join(' | ')}</div>` : '';
            const descBlock = descriptionHtml ? `<div class="desc-card">${descriptionHtml}</div>` : '';
            const imageSrc = escapeHtml(product.image_url || brandLogoRaw || headerLogoRaw);
            const quantity = Number(product.quantity) || 0;
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td class="image-cell"><img src="${imageSrc}" alt="${safeName}" class="product-image"></td>
                    <td>${safeName}</td>
                    <td>${descBlock}${optionsText}</td>
                    <td>${quantity}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>${formatCurrency(product.subtotal)}</td>
                </tr>
            `;
        }).join('');

        const notesBlock = customerNotes ? `<p class="text-body"><strong>Client Notes:</strong> ${customerNotes}</p>` : '';

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Quotation ${quotationNumberSafe}</title>
    <style>
        :root { --accent: #EA7946; --accent-soft: rgba(234, 121, 70, 0.08); --bg: #f3f4f6; --surface: #ffffff; --ink: #111827; --ink-soft: #374151; --muted: #6b7280; --border: #e5e7eb; --shadow: rgba(15, 23, 42, 0.08); }
        * { box-sizing: border-box; }
        body { font-family: 'Inter','Segoe UI', Arial, sans-serif; margin: 0; background: var(--bg); color: var(--ink); padding: 32px 24px; }
        .document-shell { max-width: 780px; margin: 0 auto; background: var(--surface); border-radius: 18px; border: 1px solid var(--border); box-shadow: 0 18px 55px rgba(15,23,42,0.12); padding: 32px 36px; }
        .document-header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 18px; margin-bottom: 24px; }
        .identity { display: flex; gap: 16px; align-items: flex-start; }
        .document-logo { width: 120px; height: auto; object-fit: contain; border-radius: 12px; background: #fff; padding: 4px; border: 1px solid var(--border); }
        .company-name { font-size: 22px; font-weight: 800; margin: 0 0 6px; color: var(--accent); letter-spacing: 0.2px; }
        .company-meta { font-size: 13px; color: var(--muted); line-height: 1.6; margin: 0; }
        .brand-chip { display: flex; align-items: center; gap: 12px; background: var(--accent-soft); border: 1px solid rgba(234,121,70,0.35); border-radius: 14px; padding: 10px 18px; }
        .brand-chip img { width: 48px; height: 48px; object-fit: contain; background: #fff; border-radius: 12px; padding: 6px; border: 1px solid rgba(234,121,70,0.35); }
        .brand-chip .chip-stack { display: flex; flex-direction: column; gap: 4px; }
        .chip-label { font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.08em; }
        .chip-value { font-weight: 700; font-size: 15px; color: var(--accent); }
        .section-block { margin-bottom: 24px; }
        .card { border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 14px 36px rgba(15,23,42,0.08); background: var(--surface); padding: 20px 24px; }
        .card.accent { background: linear-gradient(145deg, rgba(234,121,70,0.14), rgba(234,121,70,0.06)); border-color: rgba(234,121,70,0.35); }
        .card.soft { background: #fdfaf7; }
        .card.table-card { padding: 20px 0 0; border: 1px solid rgba(234,121,70,0.2); box-shadow: 0 20px 40px rgba(15,23,42,0.12); border-radius: 18px; }
        .card.table-card .section-heading { padding: 0 24px; }
        .card.table-card .table-wrapper { padding: 0 24px 24px; }
        .section-heading { margin-bottom: 14px; }
        .section-heading h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--ink); }
        .section-heading span { display: block; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
        .info-item { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; }
        .info-item .label { font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.08em; }
        .info-item .value { font-size: 14px; font-weight: 600; color: var(--ink); margin-top: 6px; word-break: break-word; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
        .summary-item { background: #fff; border: 1px dashed rgba(234,121,70,0.4); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
        .summary-item .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
        .summary-item .value { font-size: 16px; font-weight: 700; color: var(--ink); }
        .summary-item.highlight { background: var(--accent); color: #fff; border: none; box-shadow: 0 18px 40px rgba(234,121,70,0.32); }
        .summary-item.highlight .label { color: rgba(255,255,255,0.8); }
        .summary-item.highlight .value { color: #fff; }
        .summary-item.discount .value { color: var(--accent); }
        .summary-item.subtle .value { color: var(--muted); font-weight: 600; }
        .text-body { font-size: 13.5px; line-height: 1.7; color: var(--muted); margin: 10px 0; }
        .text-body strong { color: var(--ink); }
        .products-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .products-table thead { display: table-header-group; }
        .products-table tbody { display: table-row-group; }
        .products-table th { background: rgba(234,121,70,0.12); color: var(--ink); font-weight: 700; padding: 12px 10px; border-bottom: 1px solid rgba(234,121,70,0.3); text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; }
        .products-table td { padding: 12px 10px; border-bottom: 1px solid var(--border); vertical-align: top; color: var(--ink-soft); }
        .products-table tr:nth-child(even) { background: #fafafa; }
        .products-table .image-cell { width: 82px; }
        .products-table .product-image { width: 60px; height: 60px; object-fit: contain; border-radius: 12px; border: 1px solid var(--border); padding: 4px; background: #fff; }
        .desc-card { border-left: 3px solid rgba(234,121,70,0.6); background: rgba(234,121,70,0.08); border-radius: 10px; padding: 8px 10px; color: var(--ink-soft); margin-bottom: 8px; }
        .item-options { margin-top: 4px; font-size: 12px; color: var(--muted); }
        .two-column { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
        ul { padding-left: 18px; margin: 8px 0 12px; color: var(--muted); }
        ul li { margin-bottom: 6px; }
        .bank-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        .bank-item { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; }
        .bank-item .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
        .bank-item .value { font-size: 14px; font-weight: 600; color: var(--ink); margin-top: 6px; }
        .signature-card { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-radius: 16px; border: 1px solid var(--border); background: #fff; padding: 16px 24px; box-shadow: 0 12px 28px rgba(15,23,42,0.06); }
        .signature-details { font-size: 13px; color: var(--muted); line-height: 1.6; }
        .document-stamp { width: 140px; height: auto; object-fit: contain; }
        .footer { border-top: 1px solid var(--border); margin-top: 28px; padding-top: 16px; text-align: center; font-size: 12px; color: var(--muted); line-height: 1.5; }
        .no-break { page-break-inside: avoid; break-inside: avoid; }
        .force-break { page-break-before: always; break-before: page; }
        table, tr, td, th { break-inside: avoid; page-break-inside: avoid; }
        .table-wrapper { page-break-inside: auto; }
        .card.table-card { page-break-inside: auto; }
        @page { margin: 12mm; }
    </style>
</head>
<body>
    <main class="document-shell">
        <header class="document-header no-break">
            <div class="identity">
                <img src="${headerLogo}" alt="Zuccess logo" class="document-logo">
                <div>
                    <h1 class="company-name">Zuccess Intelligent Systems L.L.C</h1>
                    <p class="company-meta">Shop02, Akh Building, Jurf3, Ajman<br>www.zuccess.net | +971 54 437 5797</p>
                </div>
            </div>
            <div class="brand-chip">
                <img src="${brandLogo}" alt="${brandLabel} logo">
                <div class="chip-stack">
                    <span class="chip-label">Catalogue</span>
                    <span class="chip-value">${brandLabel}</span>
                </div>
            </div>
        </header>

        <section class="section-block card neutral info-card no-break">
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">Quotation #</span>
                    <span class="value">${quotationNumberSafe}</span>
                </div>
                <div class="info-item">
                    <span class="label">Date</span>
                    <span class="value">${currentDate}</span>
                </div>
                <div class="info-item">
                    <span class="label">Customer</span>
                    <span class="value">${customerNameDisplay}</span>
                </div>
                <div class="info-item">
                    <span class="label">Phone</span>
                    <span class="value">${customerPhoneDisplay}</span>
                </div>
                <div class="info-item">
                    <span class="label">Location</span>
                    <span class="value">${locationDisplay}</span>
                </div>
                <div class="info-item">
                    <span class="label">Prepared By</span>
                    <span class="value">${preparedBy}</span>
                </div>
            </div>
        </section>

        <section class="section-block card accent no-break">
            <div class="section-heading">
                <h2>Executive Summary</h2>
                <span>Project vision & approach</span>
            </div>
            <p class="text-body">We are pleased to present the following proposal outlining the smart home solutions and services that Zuccess Intelligent Home will provide.</p>
            <p class="text-body">Our approach focuses on delivering comfort, efficiency, and security through advanced automation systems. Our goal goes beyond supplying devices; we aim to create an intelligent living environment where lighting, curtains, climate, and security systems operate in complete harmony.</p>
            <p class="text-body">To ensure the best experience, we recommend a comprehensive service covering installation, programming, and customized scenarios tailored to daily routines. This approach makes your home not just a modern living space, but a benchmark for comfort, energy efficiency, and innovation.</p>
            <p class="text-body">With Zuccess Intelligent Home, every detail is designed to simplify your lifestyle and bring smart living within your reach.</p>
            ${notesBlock}
        </section>

        <section class="section-block card soft no-break">
            <div class="section-heading">
                <h2>Investment Overview</h2>
                <span>Financial breakdown & labor</span>
            </div>
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="label">Products Total</span>
                    <span class="value">${formatCurrency(productsTotal)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Installation Fee</span>
                    <span class="value">${formatCurrency(installationFee)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Programming Fee</span>
                    <span class="value">${formatCurrency(programmingFee)}</span>
                </div>
                <div class="summary-item discount">
                    <span class="label">Discount</span>
                    <span class="value">${formatDiscount(discountValue)}</span>
                </div>
                <div class="summary-item subtle">
                    <span class="label">Estimated Work Days</span>
                    <span class="value">${workDaysDisplay}</span>
                </div>
                <div class="summary-item highlight">
                    <span class="label">Grand Total</span>
                    <span class="value">${formatCurrency(totalAmount)}</span>
                </div>
            </div>
        </section>

        <section class="section-block card table-card">
            <div class="section-heading">
                <h2>Scope of Work</h2>
                <span>Itemized bill of materials & services</span>
            </div>
            <div class="table-wrapper">
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>Item No.</th>
                            <th>Image</th>
                            <th>Item Name</th>
                            <th>Description & Options</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsRows}
                    </tbody>
                </table>
            </div>
        </section>

        <section class="section-block card neutral force-break">
            <div class="section-heading">
                <h2>Terms & Conditions</h2>
                <span>Project execution & warranty</span>
            </div>
            <div class="two-column">
                <div>
                    <h3>Payment Schedule</h3>
                    <ul>
                        <li>Initial Payment: 50% of total amount to be paid upon signing the contract.</li>
                        <li>Installation Start: Installation works commence 25 days after contract signing.</li>
                        <li>Final Payment: Remaining 50% upon completion of delivery, installation, and testing.</li>
                    </ul>
                </div>
                <div>
                    <h3>Warranty & Support</h3>
                    <ul>
                        <li>All devices include a 24-month manufacturer warranty.</li>
                        <li>Installation and programming are covered by a 3-month service warranty.</li>
                        <li>Additional requests or change orders will be quoted separately.</li>
                    </ul>
                </div>
            </div>
            <p class="text-body"><strong>Installation Duration:</strong> ${workDaysDisplay}, depending on project size and site conditions.</p>
            <p class="text-body"><strong>Quotation Validity:</strong> 30 days from issue date.</p>
        </section>

        <section class="section-block card soft no-break">
            <div class="section-heading">
                <h2>Banking Information</h2>
                <span>Payment destination</span>
            </div>
            <div class="bank-grid">
                <div class="bank-item">
                    <span class="label">Account Name</span>
                    <span class="value">ZUCCESS INTELLIGENT HOME (S.P.S. – L.L.C)</span>
                </div>
                <div class="bank-item">
                    <span class="label">Account Number</span>
                    <span class="value">0193586397001</span>
                </div>
                <div class="bank-item">
                    <span class="label">IBAN</span>
                    <span class="value">AE30 0400 0001 9358 6397 001</span>
                </div>
                <div class="bank-item">
                    <span class="label">Currency</span>
                    <span class="value">AED (United Arab Emirates Dirham)</span>
                </div>
            </div>
        </section>

        <section class="section-block signature-card no-break">
            <div class="signature-details">
                <strong>Prepared by:</strong> ${preparedBy}<br>
                Date: ${currentDate}
            </div>
            <img src="${stampLogo}" alt="Company stamp" class="document-stamp">
        </section>

        <div class="footer no-break">
            ZUCCESS - Intelligent Home UAE License No.: 132872<br>
            www.zuccess.net | +971 54 437 5797
        </div>
    </main>
</body>
</html>`;
    }

    async saveQuotation(quotationNumber) {
        const payload = {
            quotation_number: quotationNumber,
            quoter_id: this.getValidQuoterId(),
            customer_name: this.quotationData.customer.name,
            customer_phone: this.quotationData.customer.phone,
            building_location: this.quotationData.customer.location,
            extra_notes: this.quotationData.customer.notes,
            selected_products: this.quotationData.products,
            labor_days: this.quotationData.labor.days,
            programming_fee: this.quotationData.labor.programmingFee,
            installation_fee: this.quotationData.labor.installationFee,
            discount: this.quotationData.labor.discount,
            total_amount: this.quotationData.total,
            status: 'draft'
        };

        const client = await this.ensureSupabaseClient();
        if (!client) {
            console.warn('Supabase client unavailable. Quotation payload retained locally.', payload);
            return { success: false, payload };
        }

        const tableName = (typeof TABLES !== 'undefined' && TABLES.QUOTATIONS) ? TABLES.QUOTATIONS : 'quotations';
        const { error } = await this.runWithRetry(
            () => client.from(tableName).insert([payload]),
            { retries: 2, timeoutMs: 8000, backoffMs: 800 }
        );

        if (error) {
            throw new Error(error.message || 'Unable to save quotation to Supabase');
        }

        return { success: true };
    }

    isSupabaseClientReady() {
        return Boolean(this.supabaseClient);
    }

    getValidQuoterId() {
        const identifier = this.currentUser?.id;
        return this.isValidUUID(identifier) ? identifier : null;
    }

    isValidUUID(value) {
        return typeof value === 'string' && /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(value);
    }


    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            if (page.id === pageId) {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });

        this.currentPage = pageId;
        if (pageId === 'catalog-page') {
            this.ensureProductsLoaded();
        }
        this.updateStepIndicator(pageId);
        this.persistDraft();
    }

    updateStepIndicator(pageId) {
        if (!this.dom.stepper) {
            return;
        }

        const items = Array.from(this.dom.stepper.querySelectorAll('.stepper-item'));
        const currentIndex = this.stepOrder.indexOf(pageId);

        items.forEach((item, index) => {
            item.classList.toggle('current', index === currentIndex);
            item.classList.toggle('completed', index < currentIndex);
        });
    }

    handleStepperClick(event) {
        const target = event.target.closest('.stepper-item');
        if (!target) {
            return;
        }

        const targetIndex = parseInt(target.dataset.stepIndex, 10);
        if (Number.isNaN(targetIndex)) {
            return;
        }

        const currentIndex = this.stepOrder.indexOf(this.currentPage);
        if (targetIndex > currentIndex) {
            return;
        }

        const pageId = target.dataset.page;
        if (pageId) {
            this.showPage(pageId);
        }
    }

    showLoading(show) {
        if (!this.dom.loadingOverlay) {
            return;
        }
        this.dom.loadingOverlay.classList.toggle('active', show);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        const backgroundColor = type === 'success'
            ? '#00D4AA'
            : type === 'error'
            ? '#FF5757'
            : type === 'warning'
            ? '#FFB800'
            : '#4A90E2';

        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    checkAuthState() {
        if (!window.localStorage) {
            return;
        }
        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                this.currentUser = this.sanitizeUser(parsedUser);
                if (this.currentUser) {
                    if (window.localStorage) {
                        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.currentUser));
                    }
                    this.updateUIAfterLogin();
                }
            } catch (error) {
                console.warn('Error parsing stored user', error);
            }
        }
    }

    persistDraft() {
        if (this.isRestoring || !window.localStorage) {
            return;
        }

        try {
            const draft = {
                currentUser: this.currentUser,
                selectedBrand: this.selectedBrand,
                selectedProducts: this.selectedProducts,
                quotationData: this.quotationData,
                currentPage: this.currentPage
            };
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (error) {
            console.warn('Unable to persist draft:', error);
        }
    }

    clearDraft() {
        if (window.localStorage) {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
    }

    async restoreDraft() {
        if (!window.localStorage) {
            return;
        }

        this.hasRestoredDraft = false;
        const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!rawDraft) {
            return;
        }

        try {
            const draft = JSON.parse(rawDraft);
            this.isRestoring = true;
            this.hasRestoredDraft = true;

            if (draft.currentUser) {
                this.currentUser = this.sanitizeUser(draft.currentUser);
                if (this.currentUser) {
                    this.updateUIAfterLogin();
                }
            }

            this.selectedBrand = draft.selectedBrand || '';
            this.pendingBrand = this.selectedBrand || null;
            if (this.dom.brandSelect) {
                this.dom.brandSelect.value = this.selectedBrand;
            }
            if (this.selectedBrand) {
                this.applyBrandTheme(this.selectedBrand);
                this.showBrandModal(false);
            } else {
                this.resetBrandTheme();
            }

            this.selectedProducts = Array.isArray(draft.selectedProducts) ? draft.selectedProducts : [];
            this.quotationData = {
                ...this.createEmptyQuotation(),
                ...draft.quotationData,
                products: Array.isArray(draft.quotationData?.products) ? draft.quotationData.products : []
            };

            if (this.quotationData.labor) {
                if (this.dom.workDaysInput) this.dom.workDaysInput.value = this.quotationData.labor.days || 0;
                if (this.dom.programmingInput) this.dom.programmingInput.value = this.quotationData.labor.programmingFee || '';
                if (this.dom.installationInput) this.dom.installationInput.value = this.quotationData.labor.installationFee || '';
                if (this.dom.discountInput) this.dom.discountInput.value = this.quotationData.labor.discountInput || '';
            }

            if (this.quotationData.customer) {
                if (this.dom.customerName) this.dom.customerName.value = this.quotationData.customer.name || '';
                if (this.dom.customerPhone) this.dom.customerPhone.value = this.quotationData.customer.phone || '';
                if (this.dom.customerLocation) this.dom.customerLocation.value = this.quotationData.customer.location || '';
                if (this.dom.customerNotes) this.dom.customerNotes.value = this.quotationData.customer.notes || '';
            }

            this.currentPage = draft.currentPage || 'landing-page';

            if (this.selectedBrand) {
                await this.ensureProductsLoaded(true);
            }

            this.updateSelectedSummary({ animate: false });
            this.updateLaborPageDisplay();
            this.calculateTotal({ silent: true });
            this.showPage(this.currentPage);
            this.showNotification('Draft restored from your last session', 'info');
        } catch (error) {
            console.error('Error restoring draft:', error);
            this.hasRestoredDraft = false;
        } finally {
            this.isRestoring = false;
        }
    }

    resetFlow({ preserveUser = true } = {}) {
        this.hasRestoredDraft = false;
        this.selectedBrand = '';
        this.pendingBrand = null;
        this.selectedProducts = [];
        this.activeProducts = {};
        this.currentCatalogBrand = '';
        this.activeCategory = 'panels';
        this.currentPage = 'landing-page';
        this.quotationData = this.createEmptyQuotation();

        if (this.dom.brandSelect) {
            this.dom.brandSelect.value = '';
        }
        if (this.dom.productsGrid) {
            this.dom.productsGrid.innerHTML = '';
        }
        if (this.dom.productsEmptyState) {
            this.dom.productsEmptyState.hidden = true;
        }

        this.resetBrandTheme();
        this.resetLaborForm();
        this.resetCustomerForm();
        this.updateSelectedSummary({ animate: false });
        this.updateLaborPageDisplay();
        this.showPage('landing-page');

        if (preserveUser && this.currentUser) {
            this.openBrandModal();
        } else if (this.dom.navUser) {
            this.dom.navUser.style.display = 'none';
        }

        this.persistDraft();
    }

    resetLaborForm() {
        if (this.dom.workDaysInput) this.dom.workDaysInput.value = 5;
        if (this.dom.programmingInput) this.dom.programmingInput.value = '';
        if (this.dom.installationInput) this.dom.installationInput.value = '';
        if (this.dom.discountInput) this.dom.discountInput.value = '';
        this.calculateTotal({ silent: true });
    }

    resetCustomerForm() {
        if (this.dom.customerName) this.dom.customerName.value = '';
        if (this.dom.customerPhone) this.dom.customerPhone.value = '';
        if (this.dom.customerLocation) this.dom.customerLocation.value = '';
        if (this.dom.customerNotes) this.dom.customerNotes.value = '';
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    window.quoterApp = new ZuccessQuoter();
});
