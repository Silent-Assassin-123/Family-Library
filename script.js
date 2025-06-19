// Supabase Configuration
// Your specific Project URL and anon public key are filled in below.
const SUPABASE_URL = 'https://wwrovxwbfpkzbmcjlssd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cm92eHdiZnBremJtY2psc3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzY0NjIsImV4cCI6MjA2NTc1MjQ2Mn0.b2JkigbElvXnnnt0wve_7FWdhBSYfAgvoi6SVUahI6U';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("script.js has started executing!"); // Debug log

// --- DOM Elements ---
const app = document.getElementById('app');
const authSection = document.getElementById('authSection');
const booksSection = document.getElementById('booksSection');
const leaderboardSection = document.getElementById('leaderboardSection');
const adminSection = document.getElementById('adminSection');

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signInEmailBtn = document.getElementById('signInEmailBtn');
const signUpEmailBtn = document.getElementById('signUpEmailBtn');
const signInGoogleBtn = document.getElementById('signInGoogleBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userEmailSpan = document.getElementById('userEmail');
const adminTab = document.getElementById('adminTab');

const tabsNav = document.getElementById('tabsNav');
const booksGrid = document.getElementById('booksGrid');
const leaderboardList = document.getElementById('leaderboardList');
const adminBooksList = document.getElementById('adminBooksList');
const showAddBookModalBtn = document.getElementById('showAddBookModalBtn');

const modalOverlay = document.getElementById('modalOverlay');
const modalMessage = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

const bookModalOverlay = document.getElementById('bookModalOverlay');
const bookModalTitle = document.getElementById('bookModalTitle');
const bookForm = document.getElementById('bookForm');
const bookIdInput = document.getElementById('bookIdInput');
const bookTitleInput = document.getElementById('bookTitle');
const bookAuthorInput = document.getElementById('bookAuthor');
const bookGenreInput = document.getElementById('bookGenre');
const cancelBookModalBtn = document.getElementById('cancelBookModalBtn'); // Fixed typo here

// --- Global State ---
let currentUser = null;
let isAdmin = false;
let activeTab = 'books'; // Default tab

// --- Helper Functions ---

function showModal(message, onConfirm, showCancel = false, onCancel = null) {
    console.log("Showing modal with message:", message); // Debug log
    modalMessage.textContent = message;
    modalConfirmBtn.onclick = () => {
        console.log("OK button clicked, attempting to hide modal."); // Debug log
        modalOverlay.classList.add('hidden');
        if (onConfirm) onConfirm();
    };
    if (showCancel) {
        modalCancelBtn.classList.remove('hidden');
        modalCancelBtn.onclick = () => {
            console.log("Cancel button clicked, attempting to hide modal."); // Debug log
            modalOverlay.classList.add('hidden');
            if (onCancel) onCancel();
        };
    } else {
        modalCancelBtn.classList.add('hidden');
    }
    modalOverlay.classList.remove('hidden');
}

function showBookModal(book = null) {
    bookForm.reset();
    bookIdInput.value = '';
    if (book) {
        bookModalTitle.textContent = 'Edit Book';
        bookIdInput.value = book.id;
        bookTitleInput.value = book.title;
        bookAuthorInput.value = book.author;
        bookGenreInput.value = book.genre || '';
    } else {
        bookModalTitle.textContent = 'Add New Book';
    }
    bookModalOverlay.classList.remove('hidden');
}

function hideBookModal() {
    bookModalOverlay.classList.add('hidden');
}

function switchTab(tabName) {
    console.log("Switching to tab:", tabName); // Debug log
    activeTab = tabName;

    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Show the active section and set active tab button
    const targetSection = document.getElementById(`${tabName}Section`);
    const targetButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);

    if (targetSection) targetSection.classList.remove('hidden');
    if (targetButton) targetButton.classList.add('active');


    // Load data for the active tab
    if (tabName === 'books') {
        loadBooks();
    } else if (tabName === 'leaderboard') {
        loadLeaderboard();
    } else if (tabName === 'admin') {
        loadBooks(true); // Load books for admin view
    }
}

async function updateUIForUser(user) {
    currentUser = user;
    console.log("updateUIForUser called, user:", user ? user.email : "null"); // Debug log
    if (user) {
        authSection.classList.add('hidden');
        tabsNav.classList.remove('hidden');
        signOutBtn.classList.remove('hidden');
        userEmailSpan.textContent = user.email;

        // Fetch user's role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found (new user)
            console.error('Error fetching profile:', profileError);
            showModal('Error fetching user profile.');
            isAdmin = false;
        } else if (profile && profile.role === 'admin') {
            isAdmin = true;
        } else {
            isAdmin = false;
            // If new user, ensure profile is created (Supabase trigger handles this normally, but good fallback)
            if (profileError && profileError.code === 'PGRST116') {
                 const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{ id: user.id, email: user.email, role: 'user' }]);
                 if (insertError) console.error('Error creating profile for new user:', insertError);
            }
        }

        if (isAdmin) {
            adminTab.classList.remove('hidden');
        } else {
            adminTab.classList.add('hidden');
            // If user somehow becomes non-admin while on admin tab, switch away
            if (activeTab === 'admin') {
                switchTab('books');
            }
        }

        switchTab(activeTab); // Reload active tab content
    } else {
        console.log("No current user, showing auth section and modal."); // Debug log
        authSection.classList.remove('hidden');
        booksSection.classList.add('hidden');
        leaderboardSection.classList.add('hidden');
        adminSection.classList.add('hidden');
        tabsNav.classList.add('hidden');
        signOutBtn.classList.add('hidden');
        userEmailSpan.textContent = '';
        adminTab.classList.add('hidden');
        currentUser = null;
        isAdmin = false;
        showModal('Please sign in to access the library.'); // This shows the modal
    }
}

// --- Authentication Functions ---

async function signInWithEmail() {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        showModal('Please enter both email and password.');
        return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        console.error('Sign In Error:', error.message);
        showModal('Sign In Failed: ' + error.message);
    } else {
        showModal('Signed in successfully!');
        emailInput.value = '';
        passwordInput.value = '';
    }
}

async function signUpWithEmail() {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        showModal('Please enter both email and password.');
        return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        console.error('Sign Up Error:', error.message);
        showModal('Sign Up Failed: ' + error.message);
    } else {
        // Supabase trigger `handle_new_user` will create the profile with 'user' role
        showModal('Signed up successfully! Please check your email to confirm your account (if email confirmation is enabled in Supabase).');
        emailInput.value = '';
        passwordInput.value = '';
    }
}

async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin, // Redirects back to your app after auth
        },
    });
    if (error) {
        console.error('Google Sign In Error:', error.message);
        showModal('Google Sign In Failed: ' + error.message);
    }
    // No need for success modal here, onAuthStateChange will handle UI update
}

async function signOutUser() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Sign Out Error:', error.message);
        showModal('Sign Out Failed: ' + error.message);
    } else {
        showModal('Signed out successfully.');
        // UI will be updated by onAuthStateChange liste
