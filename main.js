import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  increment,
  addDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDkRd4G3YMekE0I42Ah76uDnkTa4z8efZ4",
  authDomain: "pearn-bb581.firebaseapp.com",
  databaseURL: "https://pearn-bb581-default-rtdb.firebaseio.com",
  projectId: "pearn-bb581",
  storageBucket: "pearn-bb581.firebasestorage.app",
  messagingSenderId: "950539414776",
  appId: "1:950539414776:web:251f34df2ae4d520949f0d",
  measurementId: "G-W331JHE4ZK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');

// AUTH PAGE LOGIC
if (document.getElementById('login-btn')) {
  document.getElementById('signup-btn').addEventListener('click', () => {
    document.getElementById('name').style.display = 'block';
    document.getElementById('acc-number').style.display = 'block';
  });

  document.getElementById('signup-btn').addEventListener('click', async () => {
    const name = document.getElementById('name').value.trim();
    const accNumber = document.getElementById('acc-number').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const msg = document.getElementById('auth-msg');

    if (!name || !accNumber || !email || !password) {
      msg.textContent = "Fill all fields to sign up";
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      await setDoc(doc(db, "users", uid), {
        name: name,
        accountNumber: accNumber,
        email: email,
        balance: 0,
        refCode: uid.substring(0, 8),
        referredBy: refCode || null,
        hasClaimedEarn: false,  // new field
        createdAt: Date.now()
      });

      if (refCode) {
        const q = query(collection(db, "users"), where("refCode", "==", refCode));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (docSnap) => {
          await updateDoc(doc(db, "users", docSnap.id), {
            balance: increment(50)
          });
        });
      }

      window.location.href = "dashboard.html";
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const msg = document.getElementById('auth-msg');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      msg.textContent = err.message;
    }
  });
}

// DASHBOARD PAGE LOGIC
if (document.getElementById('dashboard')) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      document.getElementById('value').textContent = data.balance;
      document.getElementById('ref-link').textContent = `${window.location.origin}/auth.html?ref=${data.refCode}`;

      // Disable earn button if already claimed
      const earnBtn = document.getElementById('earn-btn');
      if (data.hasClaimedEarn) {
        earnBtn.textContent = "Already Claimed ₦100";
        earnBtn.style.opacity = "0.5";
        earnBtn.style.pointerEvents = "none";
      }
    }

    // One-time earn button with WhatsApp link
    document.getElementById('earn-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      
      const userDoc = await getDoc(userRef);
      const data = userDoc.data();
      
      if (data.hasClaimedEarn) {
        alert("You already claimed this reward");
        return;
      }

      // Open WhatsApp group
      window.open("https://chat.whatsapp.com/DJszYT5IZko8bkKKTOkBA0", "_blank");

      // Wait 3 seconds, then credit user
      setTimeout(async () => {
        await updateDoc(userRef, {
          balance: increment(100),
          hasClaimedEarn: true
        });
        
        const newDoc = await getDoc(userRef);
        document.getElementById('value').textContent = newDoc.data().balance;
        
        const earnBtn = document.getElementById('earn-btn');
        earnBtn.textContent = "Already Claimed ₦100";
        earnBtn.style.opacity = "0.5";
        earnBtn.style.pointerEvents = "none";
        
        alert("₦100 added to your balance!");
      }, 3000);
    });

    // Copy link
    document.getElementById('copi').addEventListener('click', () => {
      navigator.clipboard.writeText(document.getElementById('ref-link').textContent);
      alert("Link copied!");
    });

    // Withdraw
    document.getElementById('withdraw-btn').addEventListener('click', async () => {
      const userDoc = await getDoc(userRef);
      const data = userDoc.data();
      
      if (data.balance < 500) {
        alert("Minimum withdrawal is ₦500");
        return;
      }

      await addDoc(collection(db, "withdrawals"), {
        uid: user.uid,
        name: data.name,
        accountNumber: data.accountNumber,
        amount: data.balance,
        status: "pending",
        createdAt: Date.now()
      });

      await updateDoc(userRef, { balance: 0 });
      document.getElementById('value').textContent = 0;
      alert("Withdrawal request sent!");
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "auth.html";
    });
  });
}