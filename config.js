// Supabase configuration is now loaded at runtime from a JSON file to avoid bundling secrets.
// Provide a runtime-config.json alongside the deployed assets with the structure documented in README.

const TABLES = {
    ADMIN_USERS: 'admin_users',
    PRODUCTS: 'products',
    QUOTATIONS: 'quotations'
};

// Asset registry
const BRAND_CONFIG = {
    orvibo: {
        key: 'orvibo',
        label: 'Orvibo',
        websiteLogo: 'Orvibo_logo.png',
        documentLogo: 'Orvibo_logo.png',
        accent: '#f28a5a'
    },
    zuccess: {
        key: 'zuccess',
        label: 'Zuccess Standard',
        websiteLogo: 'zuccess_logo_in_website.png',
        documentLogo: 'zuccess_logo_in_document.png',
        accent: '#ea7946'
    },
    abb: {
        key: 'abb',
        label: 'ABB (Coming Soon)',
        websiteLogo: 'zuccess_logo_in_website.png',
        documentLogo: 'zuccess_logo_in_document.png',
        accent: '#d4d4d4',
        comingSoon: true
    },
    schneider: {
        key: 'schneider',
        label: 'Schneider (Coming Soon)',
        websiteLogo: 'zuccess_logo_in_website.png',
        documentLogo: 'zuccess_logo_in_document.png',
        accent: '#8bc34a',
        comingSoon: true
    },
    siemens: {
        key: 'siemens',
        label: 'Siemens (Coming Soon)',
        websiteLogo: 'zuccess_logo_in_website.png',
        documentLogo: 'zuccess_logo_in_document.png',
        accent: '#0f9bd7',
        comingSoon: true
    },
    gvs: {
        key: 'gvs',
        label: 'GVS (Coming Soon)',
        websiteLogo: 'zuccess_logo_in_website.png',
        documentLogo: 'zuccess_logo_in_document.png',
        accent: '#9c27b0',
        comingSoon: true
    }
};

const DOCUMENT_ASSETS = {
    headerLogo: 'zuccess_logo_in_document.png',
    stamp: 'Zuccess%20Stamp.png'
};

const FALLBACK_PRODUCTS_URL = 'products-data.json';

// Sample admin users used for offline development only
const SAMPLE_ADMINS = [
    {
        id: 'admin-1',
        username: 'yazan',
        password: 'yazan123',
        full_name: 'Yazan Hakawati',
        signature_url: 'zuccess_logo_in_document.png'
    },
    {
        id: 'admin-2',
        username: 'jamal',
        password: 'jamal123',
        full_name: 'Jamal Mohammad',
        signature_url: 'zuccess_logo_in_document.png'
    },
    {
        id: 'admin-3',
        username: 'anas',
        password: 'anas123',
        full_name: 'Anas Salem',
        signature_url: 'zuccess_logo_in_document.png'
    }
];

const RUNTIME_CONFIG_URL = typeof window !== 'undefined' && window.RUNTIME_CONFIG_URL
    ? window.RUNTIME_CONFIG_URL
    : 'runtime-config.json';

let runtimeConfigPromise = null;
let supabaseClientPromise = null;

async function loadRuntimeConfig() {
    if (runtimeConfigPromise) {
        return runtimeConfigPromise;
    }

    runtimeConfigPromise = (async () => {
        if (typeof window !== 'undefined' && window.SUPABASE_CONFIG) {
            return window.SUPABASE_CONFIG;
        }

        if (typeof fetch !== 'function') {
            return {};
        }

        try {
            const response = await fetch(RUNTIME_CONFIG_URL, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('Unable to load runtime configuration');
            }
            const json = await response.json();
            return json || {};
        } catch (error) {
            console.warn('Runtime config load failed:', error);
            return {};
        }
    })();

    return runtimeConfigPromise;
}

async function createSupabaseClient() {
    if (typeof window === 'undefined' || !window.supabase?.createClient) {
        return null;
    }

    const config = await loadRuntimeConfig();
    const supabaseUrl = config.supabaseUrl || config.SUPABASE_URL || null;
    const supabaseAnonKey = config.supabaseAnonKey || config.SUPABASE_ANON_KEY || null;
    const supabaseOptions = config.supabaseOptions || {};

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase credentials are not available. Falling back to offline snapshot.');
        return null;
    }

    try {
        return window.supabase.createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);
    } catch (error) {
        console.warn('Failed to create Supabase client:', error);
        return null;
    }
}

function getSupabaseClient() {
    if (!supabaseClientPromise) {
        supabaseClientPromise = createSupabaseClient();
    }
    return supabaseClientPromise;
}

if (typeof window !== 'undefined') {
    window.loadRuntimeConfig = loadRuntimeConfig;
    window.getSupabaseClient = getSupabaseClient;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TABLES,
        BRAND_CONFIG,
        DOCUMENT_ASSETS,
        FALLBACK_PRODUCTS_URL,
        SAMPLE_ADMINS,
        loadRuntimeConfig,
        getSupabaseClient
    };
}
