// Supabase Configuration
// Your specific Project URL and anon public key are filled in below.
const SUPABASE_URL = 'https://wwrovxwbfpkzbmcjlssd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cm95cHdiZnBremJtY2psc3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzY0NjIsImV4cCI6MjA2NTc1MjQ2Mn0.b2JkigbElvXnnnt0wve_7FWdhBSYfAgvoi6SVUahI6U';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
const cancelBookModalBtn = document.getElementById('cancelBookModalBtn');

// --- Global State ---
let currentUser = null;
let isAdmin = false;
let activeTab = 'books'; // Default tab

// --- Helper Functions ---

function showModal(message, onConfirm, showCancel = false, onCancel = null) {
    modalMessage.textContent = message;
    modalConfirmBtn.onclick = () => {
        modalOverlay.classList.add('hidden');
        if (onConfirm) onConfirm();
    };
    if (showCancel) {
        modalCancelBtn.classList.remove('hidden');
        modalCancelBtn.onclick = () => {
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
    document.getElementById(`${tabName}Section`).classList.remove('hidden');
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');

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
        showModal('Please sign in to access the library.');
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
        // UI will be updated by onAuthStateChange listener
    }
}

// --- Book Management Functions (Admin Only) ---

async function addBook(title, author, genre) {
    if (!isAdmin) {
        showModal('Permission denied. Only admins can add books.');
        return;
    }
    const { error } = await supabase
        .from('books')
        .insert([{ title, author, genre }]);
    if (error) {
        console.error('Error adding book:', error.message);
        showModal('Failed to add book: ' + error.message);
    } else {
        showModal('Book added successfully!');
        loadBooks(true); // Reload admin view
    }
}

async function updateBook(id, title, author, genre) {
    if (!isAdmin) {
        showModal('Permission denied. Only admins can edit books.');
        return;
    }
    const { error } = await supabase
        .from('books')
        .update({ title, author, genre })
        .eq('id', id);
    if (error) {
        console.error('Error updating book:', error.message);
        showModal('Failed to update book: ' + error.message);
    } else {
        showModal('Book updated successfully!');
        loadBooks(true); // Reload admin view
    }
}

async function deleteBook(id) {
    if (!isAdmin) {
        showModal('Permission denied. Only admins can delete books.');
        return;
    }
    showModal('Are you sure you want to delete this book? This action cannot be undone.', async () => {
        const { error } = await supabase
            .from('books')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Error deleting book:', error.message);
            showModal('Failed to delete book: ' + error.message);
        } else {
            showModal('Book deleted successfully!');
            loadBooks(true); // Reload admin view
        }
    }, true);
}

// --- Borrow/Return Functions (User) ---

async function borrowBook(bookId) {
    if (!currentUser) {
        showModal('Please sign in to borrow books.');
        return;
    }
    const { data: book, error: fetchError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

    if (fetchError || !book) {
        console.error('Error fetching book for borrow:', fetchError?.message || 'Book not found');
        showModal('Could not find book to borrow.');
        return;
    }
    if (!book.available) {
        showModal('This book is currently unavailable.');
        return;
    }

    // Start a transaction-like process (client-side for simplicity, more robust server-side with RLS)
    const { error: updateError } = await supabase
        .from('books')
        .update({ available: false, borrowed_by: currentUser.id, borrowed_at: new Date().toISOString() })
        .eq('id', bookId);

    if (updateError) {
        console.error('Error updating book status for borrow:', updateError.message);
        showModal('Failed to borrow book: ' + updateError.message);
        return;
    }

    // Add to borrowed history
    const { error: historyError } = await supabase
        .from('borrowed_history')
        .insert([{ user_id: currentUser.id, book_id: bookId, borrowed_at: new Date().toISOString() }]);

    if (historyError) {
        console.error('Error adding to borrow history:', historyError.message);
        showModal('Book borrowed, but failed to record history: ' + historyError.message);
    } else {
        showModal('Book borrowed successfully!');
        loadBooks(); // Reload books for the user view
    }
}

async function returnBook(bookId) {
    if (!currentUser) {
        showModal('You must be signed in to return books.');
        return;
    }

    // Update book status
    const { error: updateError } = await supabase
        .from('books')
        .update({ available: true, borrowed_by: null, borrowed_at: null })
        .eq('id', bookId)
        .eq('borrowed_by', currentUser.id); // Ensure only the borrower can return

    if (updateError) {
        console.error('Error updating book status for return:', updateError.message);
        showModal('Failed to return book: ' + updateError.message);
        return;
    }

    // Update the corresponding borrowed history entry
    // Find the latest unreturned entry for this user and book
    const { data: historyEntry, error: historyFetchError } = await supabase
        .from('borrowed_history')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('book_id', bookId)
        .is('returned_at', null)
        .order('borrowed_at', { ascending: false })
        .limit(1)
        .single();

    if (historyFetchError || !historyEntry) {
        console.warn('Could not find unreturned history entry for book:', bookId, historyFetchError?.message);
        showModal('Book returned, but could not update history. Please contact admin.');
    } else {
        const { error: historyUpdateError } = await supabase
            .from('borrowed_history')
            .update({ returned_at: new Date().toISOString() })
            .eq('id', historyEntry.id);

        if (historyUpdateError) {
            console.error('Error updating borrow history for return:', historyUpdateError.message);
            showModal('Book returned, but failed to update history: ' + historyUpdateError.message);
        } else {
            showModal('Book returned successfully!');
        }
    }
    loadBooks(); // Reload books for the user view
}

// --- Data Loading Functions ---

async function loadBooks(forAdmin = false) {
    booksGrid.innerHTML = '<p class="loading-message">Loading books...</p>';
    adminBooksList.innerHTML = '<p class="loading-message">Loading books for admin...</p>';

    const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .order('title', { ascending: true });

    if (error) {
        console.error('Error loading books:', error.message);
        booksGrid.innerHTML = '<p class="error-message">Failed to load books. Please try again later.</p>';
        adminBooksList.innerHTML = ''; // Clear admin list on error
        return;
    }

    // Clear previous books
    booksGrid.innerHTML = '';
    adminBooksList.innerHTML = '';

    if (books.length === 0) {
        booksGrid.innerHTML = '<p class="empty-message">No books in the library yet. Admins can add some!</p>';
        adminBooksList.innerHTML = '<p class="empty-message">No books to manage.</p>';
        return;
    }

    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.classList.add('book-card');

        let statusText = book.available ? 'Available' : 'Borrowed';
        let statusClass = book.available ? 'available' : 'borrowed';
        let borrowedByText = '';

        if (!book.available && book.borrowed_by && currentUser) {
            // Only show who borrowed it if it's the current user or if admin
            if (book.borrowed_by === currentUser.id) {
                borrowedByText = ` (by you)`;
            } else if (isAdmin) {
                // Fetch borrower's email if admin and not current user
                supabase.from('profiles').select('email').eq('id', book.borrowed_by).single()
                    .then(({ data: borrowerProfile }) => {
                        if (borrowerProfile) {
                            borrowedByText = ` (by ${borrowerProfile.email})`;
                            // Update the text in the DOM if element exists
                            const borrowedBySpan = bookCard.querySelector('.borrowed-by-info');
                            if (borrowedBySpan) borrowedBySpan.textContent = borrowedByText;
                        }
                    })
                    .catch(err => console.error("Error fetching borrower email:", err.message));
            }
        }

        bookCard.innerHTML = `
            <div>
                <h3>${book.title}</h3>
                <p>by ${book.author}</p>
                <p class="text-secondary-light">${book.genre ? `Genre: ${book.genre}` : ''}</p>
                <p class="status ${statusClass}">Status: ${statusText}<span class="borrowed-by-info">${borrowedByText}</span></p>
            </div>
            <div class="card-actions">
                ${forAdmin ? `
                    <button class="button edit-button" data-id="${book.id}">Edit</button>
                    <button class="button danger-button" data-id="${book.id}">Delete</button>
                ` : `
                    ${book.available ? `
                        <button class="button primary-button borrow-btn" data-id="${book.id}">Borrow</button>
                    ` : `
                        <button class="button secondary-button return-btn" data-id="${book.id}" ${book.borrowed_by !== currentUser?.id && !isAdmin ? 'disabled' : ''}>Return</button>
                    `}
                `}
            </div>
        `;

        if (forAdmin) {
            adminBooksList.appendChild(bookCard);
            const editBtn = bookCard.querySelector('.edit-button');
            const deleteBtn = bookCard.querySelector('.danger-button');
            editBtn.addEventListener('click', () => showBookModal(book));
            deleteBtn.addEventListener('click', () => deleteBook(book.id));
        } else {
            booksGrid.appendChild(bookCard);
            const borrowBtn = bookCard.querySelector('.borrow-btn');
            const returnBtn = bookCard.querySelector('.return-btn');
            if (borrowBtn) {
                borrowBtn.addEventListener('click', () => borrowBook(book.id));
            }
            if (returnBtn) {
                returnBtn.addEventListener('click', () => returnBook(book.id));
            }
        }
    });
}

async function loadLeaderboard() {
    leaderboardList.innerHTML = '<p class="loading-message">Loading leaderboard...</p>';

    // Subquery to count borrowed books per user, then join with profiles
    const { data, error } = await supabase
        .from('borrowed_history')
        .select('user_id, count(id)')
        .not('returned_at', 'is', null) // Only count returned books for leaderboard
        .group('user_id')
        .order('count', { ascending: false });

    if (error) {
        console.error('Error loading leaderboard:', error.message);
        leaderboardList.innerHTML = '<p class="error-message">Failed to load leaderboard. Please try again later.</p>';
        return;
    }

    if (data.length === 0) {
        leaderboardList.innerHTML = '<p class="empty-message">No books have been borrowed and returned yet!</p>';
        return;
    }

    leaderboardList.innerHTML = ''; // Clear previous entries

    let rank = 1;
    for (const entry of data) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', entry.user_id)
            .single();

        const userEmail = profile ? profile.email : 'Unknown User';

        const leaderboardItem = document.createElement('div');
        leaderboardItem.classList.add('leaderboard-item');
        leaderboardItem.innerHTML = `
            <div class="rank">#${rank++}</div>
            <div class="user-info">
                <span>${userEmail}</span>
            </div>
            <div class="borrow-count">${entry.count} books</div>
        `;
        leaderboardList.appendChild(leaderboardItem);
    }
}


// --- Event Listeners ---

// Auth buttons
signInEmailBtn.addEventListener('click', signInWithEmail);
signUpEmailBtn.addEventListener('click', signUpWithEmail);
signInGoogleBtn.addEventListener('click', signInWithGoogle);
signOutBtn.addEventListener('click', signOutUser);

// Tab navigation
tabsNav.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-button')) {
        switchTab(e.target.dataset.tab);
    }
});

// Admin Panel buttons
showAddBookModalBtn.addEventListener('click', () => showBookModal());

// Book Modal buttons/form
cancelBookModalBtn.addEventListener('click', hideBookModal);
bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = bookIdInput.value;
    const title = bookTitleInput.value;
    const author = bookAuthorInput.value;
    const genre = bookGenreInput.value;

    if (id) {
        await updateBook(id, title, author, genre);
    } else {
        await addBook(title, author, genre);
    }
    hideBookModal();
});


// --- Initial Load & Auth State Listener ---

supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    updateUIForUser(session?.user || null);
});

// Check initial session on page load
// The onAuthStateChange will handle the first render, but a direct check
// can be useful if you need immediate sync
async function checkSessionAndRender() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error.message);
        updateUIForUser(null);
    } else {
        updateUIForUser(session?.user || null);
    }
}

checkSessionAndRender();
