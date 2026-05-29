import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc, getDoc, setDoc, getDocs, collection, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const loginForm     = document.getElementById("loginForm");
const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const welcomeBox    = document.getElementById("welcomeBox");

// Si el input no tiene @ busca el email en Firestore por alias o nombre
async function resolveEmail(input) {
  if (input.includes("@")) return input;
  const byAlias = await getDocs(query(collection(db, "usuarios"), where("alias", "==", input)));
  if (!byAlias.empty) return byAlias.docs[0].data().email;
  const byName  = await getDocs(query(collection(db, "usuarios"), where("nombre", "==", input)));
  if (!byName.empty)  return byName.docs[0].data().email;
  return null;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const identifier = loginEmail.value.trim();
  const password   = loginPassword.value;
  welcomeBox.textContent = "Verificando...";
  welcomeBox.classList.add("show");
  try {
    const email = await resolveEmail(identifier);
    if (!email) {
      welcomeBox.textContent = "No encontramos ninguna cuenta con ese correo o alias.";
      return;
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user  = cred.user;
    const ref   = doc(db, "usuarios", user.uid);
    const snap  = await getDoc(ref);
    let nombre = user.displayName || "viajero";
    let rol    = "usuario";
    if (snap.exists()) {
      const data = snap.data();
      nombre = data.nombre || nombre;
      rol    = data.rol    || "usuario";
    } else {
      await setDoc(ref, {
        uid: user.uid, nombre, alias: "", email: user.email,
        rol: "usuario", creadoEn: serverTimestamp()
      });
    }
    localStorage.setItem("wayture_logged_user", nombre);
    localStorage.setItem("wayture_user_role",   rol);
    welcomeBox.textContent = `Bienvenido, ${nombre}. Redirigiendo...`;
    setTimeout(() => { window.location.href = "panel-usuario.html#mis-viajes"; }, 900);
  } catch (error) {
    console.error(error);
    const code = error.code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password")
      welcomeBox.textContent = "Contraseña incorrecta. Inténtalo de nuevo.";
    else if (code === "auth/too-many-requests")
      welcomeBox.textContent = "Demasiados intentos fallidos. Espera unos minutos.";
    else if (code === "auth/user-disabled")
      welcomeBox.textContent = "Esta cuenta está deshabilitada.";
    else
      welcomeBox.textContent = "No se pudo iniciar sesión. Revisa tus datos.";
  }
});
