import { supabase } from './supabase.js';

const transactionForm = document.getElementById('transaction-form')
const txTypeInput = document.getElementById('tx-type')
const txCategoryInput = document.getElementById('tx-category')
const txAmountInput = document.getElementById('tx-amount')
const txDateInput = document.getElementById('tx-date')
const txDescInput = document.getElementById('tx-desc')

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('user-email').textContent = user.email;

    await displayUserBadges(user.id);
    await fetchTransactions(); 
    if (typeof fetchBudgets === 'function') fetchBudgets();
});

transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = txTypeInput.value;
    const category = txCategoryInput.value;
    const amount = parseFloat(txAmountInput.value);
    const date = txDateInput.value;
    const description = txDescInput.value;

    const {data: { user }, error:userError} = await supabase.auth.getUser();

    if (userError || !user){
        alert("seshn duussan bn.Dahin newterne uu!");
        window.location.href ='index.html';
        return;
    }

    if (type === 'expense') {
        const currentMonthYear = date.substring(0, 7);

        const { data: budgetData } = await supabase
            .from('budgets')
            .select('limit_amount')
            .eq('user_id', user.id)
            .eq('category', category)
            .eq('month_year', currentMonthYear)
            .maybeSingle();

        if (budgetData) {
            const limitAmount = budgetData.limit_amount;

            const { data: pastExpenses } = await supabase
                .from('transactions')
                .select('amount, date')
                .eq('user_id', user.id)
                .eq('type', 'expense')
                .eq('category', category);
            
            let totalPastExpense = 0;
            if (pastExpenses) {
                pastExpenses.forEach(tx => {
                    if (tx.date && tx.date.substring(0, 7) === currentMonthYear) {
                        totalPastExpense += tx.amount;
                    }
                });
            }

            if (totalPastExpense + amount > limitAmount) {
                const currentTotal = totalPastExpense + amount;
                const proceed = confirm(
                    `АНХААРУУЛГА!\n\nТаны ${currentMonthYear} сарын "${category}" ангиллын төсвийн хязгаар: ${limitAmount.toLocaleString()} ₮\nОдоогийн нийт зарцуулалт: ${currentTotal.toLocaleString()} ₮ болох гэж байна.\n\nТөсөв хэтрүүлж гүйлгээг үргэлжлүүлэх үү?`
                );
                
                if (!proceed) {
                    return;
                }
            }
        }
    }

    const {data, error} = await supabase.from('transactions').insert([{
        user_id:user.id,
        type:type,
        category:category,
        amount:amount,
        description:description,
        date:date
    }]).select();

    if(error){
        alert("Guilgeeg hadgalahd aldaa grlaa:" + error.message);
        console.error("Aldaanii delgerengui", error);
    } else{
        alert("Guilgee amjilttai burtgegdlee");
        transactionForm.reset();
    }

    await fetchTransactions();
    await fetchBudgets();
});

async function fetchTransactions(){
    const {data: { user }} = await supabase.auth.getUser();

    if(!user) return;

    const{ data: transactions, error } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date',{ascending: false});

    if (error){
        console.error("Guilgee unshihad aldaa garlaa", error.message);
        return;
    }

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
        if (tx.type === 'income') {
            totalIncome += tx.amount;
        } else if (tx.type === 'expense') {
            totalExpense += tx.amount;
        }
    });

    const totalBalance = totalIncome - totalExpense;

    document.getElementById('total-balance').textContent = `${totalBalance.toLocaleString()} ₮`;
    document.getElementById('total-income').textContent = `${totalIncome.toLocaleString()} ₮`;
    document.getElementById('total-expense').textContent = `${totalExpense.toLocaleString()} ₮`;

    await checkAndAwardBadges(user, transactions);
    renderTransactions(transactions);
}

function renderTransactions(transactions) {
    const listContainer = document.getElementById('transaction-list');
    
    if (transactions.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fa-solid fa-folder-open fs-3 d-block mb-2"></i>
                    Одоогоор ямар нэгэн гүйлгээ бүртгэгдээгүй байна.
                </td>
            </tr>
        `;
        return;
    }

    let htmlContent = '';
    
    transactions.forEach(tx => {
        const isIncome = tx.type === 'income';
        const badgeColor = isIncome ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
        const typeText = isIncome ? 'Орлого' : 'Зарлага';
        const amountSign = isIncome ? '+' : '-';
        const amountColor = isIncome ? 'text-success' : 'text-danger';

        htmlContent += `
            <tr>
                <td>${tx.date}</td>
                <td><span class="badge bg-light text-dark shadow-sm border">${tx.category}</span></td>
                <td class="text-secondary fw-medium">${tx.description}</td>
                <td><span class="badge ${badgeColor}">${typeText}</span></td>
                <td class="text-end fw-bold ${amountColor}">${amountSign}${tx.amount.toLocaleString()} ₮</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteTransaction('${tx.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    listContainer.innerHTML = htmlContent;
}

window.deleteTransaction = async function(id) {
    const confirmDelete = confirm("Та энэ гүйлгээг устгахдаа итгэлтэй байна уу?");
    
    if (!confirmDelete) {
        return;
    }

    try {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        alert("Гүйлгээ амжилттай устгагдлаа.");
        await fetchTransactions();
        await fetchBudgets();

    } catch (error) {
        alert("Гүйлгээ устгахад алдаа гарлаа: " + error.message);
        console.error("Устгах үеийн алдаа:", error);
    }
}

const btnLogout = document.getElementById('btn-logout');

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        const confirmLogout = confirm("Та системээс гарахдаа итгэлтэй байна уу?");
        
        if (!confirmLogout) {
            return;
        }

        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                throw error;
            }

            window.location.href = 'index.html';

        } catch (error) {
            alert("Системээс гарахад алдаа гарлаа: " + error.message);
            console.error("Logout алдаа:", error);
        }
    });
}

const budgetForm = document.getElementById('budget-form');
const budgetCategoryInput = document.getElementById('budget-category');
const budgetAmountInput = document.getElementById('budget-amount');
const budgetMonthInput = document.getElementById('budget-month');

if (budgetForm) {
    budgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const category = budgetCategoryInput.value;
        const limitAmount = parseFloat(budgetAmountInput.value);
        const monthYear = budgetMonthInput.value; 
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("Сешн дууссан байна!");
            return;
        }

        const { error } = await supabase
            .from('budgets')
            .insert([
                {
                    user_id: user.id,
                    category: category,
                    limit_amount: limitAmount,
                    month_year: monthYear
                }
            ]);

        if (error) {
            alert("Төсөв тогтооход алдаа гарлаа: " + error.message);
        } else {
            alert(`${monthYear} сарын ${category} ангилалд төсөв амжилттай тогтоогдлоо!`);
            budgetForm.reset();
            
            const instance = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasBudget'));
            if (instance) instance.hide();
            
            if (typeof fetchBudgets === 'function') fetchBudgets();
            
            await displayUserBadges(user.id);
            await fetchTransactions();
        }
    });
}

async function fetchBudgets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('month_year', { ascending: false });

    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, type, category, date')
        .eq('user_id', user.id);

    if (budgetError || txError) {
        console.error("Өгөгдөл уншихад алдаа гарлаа:", budgetError?.message || txError?.message);
        return;
    }

    const budgetsContainer = document.getElementById('current-budgets-list');
    if (!budgetsContainer) return;
    
    if (!budgets || budgets.length === 0) {
        budgetsContainer.innerHTML = `
            <h6 class="fw-bold text-dark mb-3">Одоогийн тогтоосон төсвүүд:</h6>
            <div class="text-center py-3 text-muted small bg-light rounded">Одоогоор төсөв тогтоогоогүй байна.</div>
        `;
        return;
    }

    let htmlContent = `<h6 class="fw-bold text-dark mb-3">Одоогийн тогтоосон төсвүүд:</h6>`;
    
    budgets.forEach(b => {
        let totalExpenseForCategory = 0;
        if (transactions) {
            transactions.forEach(tx => {
                if (tx.type === 'expense' && tx.category === b.category && tx.date) {
                    const txMonthYear = tx.date.substring(0, 7); 
                    if (txMonthYear === b.month_year) {
                        totalExpenseForCategory += tx.amount;
                    }
                }
            });
        }

        const limitAmount = b.limit_amount;
        const remainingAmount = limitAmount - totalExpenseForCategory;
        const percent = Math.min((totalExpenseForCategory / limitAmount) * 100, 100);

        let progressBarColor = 'bg-primary';
        if (percent >= 100) {
            progressBarColor = 'bg-danger';
        } else if (percent >= 80) {
            progressBarColor = 'bg-warning';
        }

        const remainingTextColor = remainingAmount < 0 ? 'text-danger fw-bold' : 'text-success fw-medium';

        htmlContent += `
            <div class="card p-3 mb-3 bg-white border-0 shadow-sm rounded-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <span class="fw-bold text-dark fs-6">${b.category}</span>
                        <span class="badge bg-light text-secondary border border-secondary-subtle ms-2" style="font-size: 10px;">
                            ${b.month_year}
                        </span>
                    </div>
                    <button class="btn btn-sm btn-link text-danger p-0 border-0 m-0" onclick="deleteBudget('${b.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>

                <div class="progress mb-2" style="height: 6px;">
                    <div class="progress-bar ${progressBarColor}" role="progressbar" style="width: ${percent}%;"></div>
                </div>

                <div class="row g-0 pt-1 text-secondary" style="font-size: 11px;">
                    <div class="col-4">
                        <span class="d-block text-muted text-uppercase fw-semibold" style="font-size: 9px; letter-spacing: 0.5px;">Төсөв</span>
                        <span class="fw-bold text-dark">${limitAmount.toLocaleString()} ₮</span>
                    </div>
                    <div class="col-4 border-start ps-2">
                        <span class="d-block text-muted text-uppercase fw-semibold" style="font-size: 9px; letter-spacing: 0.5px;">Зарлага</span>
                        <span class="fw-bold text-danger">${totalExpenseForCategory.toLocaleString()} ₮</span>
                    </div>
                    <div class="col-4 border-start ps-2">
                        <span class="d-block text-muted text-uppercase fw-semibold" style="font-size: 9px; letter-spacing: 0.5px;">Үлдэгдэл</span>
                        <span class="${remainingTextColor}">${remainingAmount.toLocaleString()} ₮</span>
                    </div>
                </div>
            </div>
        `;
    });

    budgetsContainer.innerHTML = htmlContent;
}

window.deleteBudget = async function(id) {
    const confirmDelete = confirm("Энэ төсвийг устгах уу?");
    if (!confirmDelete) return;

    const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Устгах үед алдаа гарлаа");
        console.error(error);
        return;
    }

    alert("Төсөв устгагдлаа");
    await fetchBudgets();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await displayUserBadges(user.id);
        await fetchTransactions();
    }
}

const BADGES_DB = {
    'first_transaction': {
        name: 'Анхны алхам',
        icon: '<i class="fa-solid fa-baby text-success" title="Анхны алхам: Анхны гүйлгээгээ бүртгэсэн"></i>',
        style: 'background-color: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.3);'
    },
    'first_budget': {
        name: 'Төсөвлөгч мастер',
        icon: '<i class="fa-solid fa-chart-pie text-secondary" title="Төсөвлөгч мастер: Анхны төсвөө амжилттай тогтоосон"></i>',
        style: 'background-color: rgba(142, 68, 173, 0.15); color: #8e44ad; border: 1px solid rgba(142, 68, 173, 0.3);'
    },
    'monthly_user': {
        name: 'Тогтвортой хэрэглэгч',
        icon: '<i class="fa-solid fa-hourglass-half text-primary" title="Тогтвортой хэрэглэгч: Системээ 1 сарын турш тогтмол ашигласан"></i>',
        style: 'background-color: rgba(52, 152, 219, 0.15); color: #2980b9; border: 1px solid rgba(52, 152, 219, 0.3);'
    },
    'budget_saver': {
        name: 'Төсвийн мастер',
        icon: '<i class="fa-solid fa-piggy-bank text-warning" title="Төсвийн мастер: Зарлагаа ухаалаг хэмнэсэн"></i>',
        style: 'background-color: rgba(241, 196, 15, 0.15); color: #f1c40f; border: 1px solid rgba(241, 196, 15, 0.3);'
    },
    'streak_6_months': {
        name: 'Санхүүгийн тууштай хөтлөгч',
        icon: '<i class="fa-solid fa-calendar-check text-info" title="Тууштай хөтлөгч: 6 сар тасралтгүй бүртгэсэн"></i>',
        style: 'background-color: rgba(52, 152, 219, 0.15); color: #3498db; border: 1px solid rgba(52, 152, 219, 0.3);'
    }
};

async function checkAndAwardBadges(user, transactions) {
    if (transactions && transactions.length >= 1) {
        await saveBadgeToSupabase(user.id, 'first_transaction');
    }

    const { count: budgetCount } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    if (budgetCount && budgetCount >= 1) {
        await saveBadgeToSupabase(user.id, 'first_budget');
    }

    if (transactions && transactions.length >= 2) {
        const dates = transactions.map(tx => new Date(tx.date).getTime());
        const oldestDate = Math.min(...dates);
        const newestDate = Math.max(...dates);
        
        const diffDays = (newestDate - oldestDate) / (1000 * 60 * 60 * 24);
        
        if (diffDays >= 30) {
            await saveBadgeToSupabase(user.id, 'monthly_user');
        }
    }

    let totalIncome = 0;
    let totalExpense = 0;
    if (transactions) {
        transactions.forEach(tx => {
            if (tx.type === 'income') totalIncome += tx.amount;
            else totalExpense += tx.amount;
        });
    }
    if (totalIncome > totalExpense && totalExpense > 0) {
        await saveBadgeToSupabase(user.id, 'budget_saver');
    }

    if (transactions) {
        const uniqueMonths = new Set(transactions.map(tx => tx.date.substring(0, 7)));
        if (uniqueMonths.size >= 6) {
            await saveBadgeToSupabase(user.id, 'streak_6_months');
        }
    }

    await displayUserBadges(user.id);
}

async function saveBadgeToSupabase(userId, badgeName) {
    const { data } = await supabase
        .from('badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_name', badgeName)
        .maybeSingle();

    if (!data) {
        const { error } = await supabase
            .from('badges')
            .insert([
                { 
                    user_id: userId, 
                    badge_name: badgeName,
                    awarded_at: new Date().toISOString()
                }
            ]);
        
        if (error) {
            console.error("Badge хадгалахад алдаа гарлаа:", error.message);
        } else {
            console.log(`🎉 Шинэ Badge амжилттай нээгдлээ: ${badgeName}`);
        }
    }
}

async function displayUserBadges(userId) {
    const navbarContainer = document.getElementById('user-badges-container');
    const offcanvasListContainer = document.getElementById('all-badges-status-list');
    
    if (!navbarContainer) return;

    const { data: earnedBadges, error } = await supabase
        .from('badges')
        .select('badge_name')
        .eq('user_id', userId);

    if (error) {
        console.error("Badge уншихад алдаа гарлаа:", error.message);
        return;
    }

    const earnedBadgeNames = earnedBadges ? earnedBadges.map(b => b.badge_name) : [];

    let navbarHtml = '';
    earnedBadgeNames.forEach(name => {
        const badgeDetails = BADGES_DB[name];
        if (badgeDetails) {
            const requirementText = badgeDetails.icon.match(/title="([^"]+)"/)[1];
            navbarHtml += `
                <span class="badge p-2 d-inline-flex align-items-center justify-content-center rounded-circle shadow-sm" 
                      style="${badgeDetails.style} width: 32px; height: 32px; cursor: pointer; font-size: 14px;"
                      title="${badgeDetails.name}: ${requirementText}">
                    ${badgeDetails.icon}
                </span>
            `;
        }
    });
    navbarContainer.innerHTML = navbarHtml;

    if (offcanvasListContainer) {
        let offcanvasHtml = '';
        
        Object.keys(BADGES_DB).forEach(key => {
            const b = BADGES_DB[key];
            const isEarned = earnedBadgeNames.includes(key);
            
            const opacityStyle = isEarned ? '' : 'opacity: 0.5; filter: grayscale(50%);';
            const statusBadge = isEarned 
                ? '<span class="badge bg-success-subtle text-success border border-success-subtle p-1 small">Нээгдсэн</span>' 
                : '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle p-1 small">Түгжигдсэн</span>';
            
            const requirementText = b.icon.match(/title="([^"]+)"/)[1];

            offcanvasHtml += `
                <div class="d-flex align-items-center justify-content-between p-2 rounded border bg-white shadow-sm" style="${opacityStyle}">
                    <div class="d-flex align-items-center gap-2">
                        <div class="p-2 rounded-circle d-inline-flex align-items-center justify-content-center" style="${b.style} width: 36px; height: 36px;">
                            ${b.icon}
                        </div>
                        <div>
                            <div class="fw-bold text-dark p-0 m-0" style="font-size: 13px;">${b.name}</div>
                            <div class="text-muted small" style="font-size: 11px;">${requirementText}</div>
                        </div>
                    </div>
                    <div>
                        ${statusBadge}
                    </div>
                </div>
            `;
        });
        
        offcanvasListContainer.innerHTML = offcanvasHtml;
    }
}