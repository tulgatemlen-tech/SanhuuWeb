import { supabase } from './supabase.js';

const authForm = document.getElementById('auth-form')
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const btnRegister = document.getElementById('btn-register')
const messageDiv = document.getElementById('message')

// ==========================================
// 1. БҮРТГҮҮЛЭХ ЛОГИК (Sign Up)
// ==========================================
btnRegister.addEventListener('click', async (e) => {
    e.preventDefault() // Хуудас дахин ачаалагдахаас сэргийлнэ
    
    console.log("Бүртгүүлэх товч дарагдлаа")
    const email = emailInput.value.trim()
    const password = passwordInput.value

    if (!email || !password) {
        showMessage("Имэйл болон нууц үгээ гүйцэд оруулна уу!", "text-danger")
        return
    }

    if (password.length < 6) { // length гэж засав
        showMessage("Нууц үг доод тал нь 6 тэмдэгт байх ёстой!", "text-danger")
        return
    }

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    })

    if (error) {
        showMessage(`Бүртгэл амжилтгүй: ${error.message}`, "text-danger")
    } else {
        showMessage("Бүртгэл амжилттай! Та нэвтрэх товчийг дарж орно уу.", "text-success")
        passwordInput.value = ""
        emailInput.value = ""
    }
})

// ==========================================
// 2. НЭВТРЭХ ЛОГИК (Sign In)
// ==========================================
authForm.addEventListener('submit', async (e) => { // auth-ийг authForm болгож засав
    e.preventDefault()

    console.log("Нэвтрэх хүсэлт илгээгдлээ")
    const email = emailInput.value.trim()
    const password = passwordInput.value

    if (!email || !password) {
        showMessage("Имэйл болон нууц үгээ оруулна уу!", "text-danger")
        return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    })

    if (error) {
        showMessage(`Нэвтрэх алдаа: ${error.message}`, "text-danger")
    } else {
        showMessage("Амжилттай нэвтэрлээ. Түр хүлээнэ үү...", "text-success")
        
        // Хэрэглэгчид амжилттай болсон зурвасыг харуулахын тулд 1.5 секунд хүлээлгээд шилжүүлнэ
        setTimeout(() => {
            window.location.href = 'dashboard.html'
        }, 1500)
    }
})

// ==========================================
// ЗУРВАС ХАРУУЛАХ ФУНКЦ
// ==========================================
function showMessage(text, bootstrapColorClass) {
    messageDiv.innerText = text
    messageDiv.className = `text-center small mt-3 fw-medium ${bootstrapColorClass}`
}