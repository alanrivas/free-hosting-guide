---
sidebar_position: 5
title: Firebase (Firestore)
---

# Firebase

Plataforma de Google que incluye base de datos NoSQL en tiempo real, autenticación, hosting, funciones y más. Ideal para apps móviles y web con sincronización en tiempo real.

## Límites del plan gratuito (Spark)

| Servicio | Límite gratuito |
|---|---|
| **Firestore** storage | 1 GB |
| Firestore reads | 50,000/día |
| Firestore writes | 20,000/día |
| Firestore deletes | 20,000/día |
| **Realtime Database** storage | 1 GB |
| Realtime Database transferencia | 10 GB/mes |
| **Hosting** storage | 10 GB |
| Hosting transferencia | 360 MB/día |
| **Authentication** | Ilimitado (gratis) |
| **Cloud Functions** | 2,000,000 invocaciones/mes |
| **Storage (Files)** | 5 GB, 1 GB/día descarga |
| Proyectos | Ilimitados |

## Crear proyecto Firebase

```
1. https://console.firebase.google.com
2. Create a project
3. Nombre del proyecto
4. Google Analytics: habilitar o no (opcional para dev)
5. Crear proyecto
```

## Configurar Firestore

```
Firebase Console → Build → Firestore Database → Create database
→ Start in test mode (para desarrollo rápido)
→ Región: elegir la más cercana
```

:::warning
El "test mode" permite read/write sin autenticación. **Cambiar las reglas antes de ir a producción.**
:::

## Instalar Firebase SDK

```bash
npm install firebase
# Para backend/admin:
npm install firebase-admin
```

## Inicializar Firebase (cliente/frontend)

```typescript
// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApps()[0]

export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
```

Obtener las credenciales en:
```
Firebase Console → Project Settings → Your apps → Web app → Config
```

## Operaciones CRUD con Firestore

```typescript
import { 
  collection, doc, addDoc, getDoc, getDocs, 
  updateDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// CREATE (auto-ID)
const docRef = await addDoc(collection(db, 'usuarios'), {
  nombre: 'Juan',
  email: 'juan@email.com',
  activo: true,
  createdAt: serverTimestamp()
})
console.log('ID creado:', docRef.id)

// CREATE (ID manual)
await setDoc(doc(db, 'usuarios', 'mi-id-custom'), {
  nombre: 'Pedro',
  email: 'pedro@email.com'
})

// READ (un documento)
const docSnap = await getDoc(doc(db, 'usuarios', userId))
if (docSnap.exists()) {
  console.log(docSnap.data())
}

// READ (colección)
const querySnapshot = await getDocs(collection(db, 'usuarios'))
querySnapshot.forEach(doc => {
  console.log(doc.id, doc.data())
})

// READ con filtros
const q = query(
  collection(db, 'usuarios'),
  where('activo', '==', true),
  orderBy('createdAt', 'desc'),
  limit(10)
)
const snapshot = await getDocs(q)

// UPDATE (solo campos específicos)
await updateDoc(doc(db, 'usuarios', userId), {
  nombre: 'Juan Carlos',
  updatedAt: serverTimestamp()
})

// DELETE
await deleteDoc(doc(db, 'usuarios', userId))
```

## Realtime (onSnapshot)

```typescript
import { onSnapshot, collection, query, where, orderBy } from 'firebase/firestore'

// Escuchar cambios en tiempo real
const q = query(
  collection(db, 'mensajes'),
  orderBy('timestamp', 'desc'),
  limit(50)
)

const unsubscribe = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      console.log('Nuevo mensaje:', change.doc.data())
    }
    if (change.type === 'modified') {
      console.log('Mensaje editado:', change.doc.data())
    }
    if (change.type === 'removed') {
      console.log('Mensaje eliminado:', change.doc.id)
    }
  })
})

// Detener escucha (importante para evitar memory leaks)
unsubscribe()
```

## Autenticación

```typescript
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

// Registro
const { user } = await createUserWithEmailAndPassword(
  auth, email, password
)

// Login
const { user } = await signInWithEmailAndPassword(
  auth, email, password
)

// Login con Google
const provider = new GoogleAuthProvider()
const { user } = await signInWithPopup(auth, provider)

// Logout
await signOut(auth)

// Observer del estado de sesión
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('Usuario logueado:', user.uid, user.email)
  } else {
    console.log('No hay sesión activa')
  }
})
```

## Reglas de seguridad de Firestore

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Solo el dueño puede leer/escribir sus datos
    match /usuarios/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }

    // Posts: lectura pública, escritura autenticada
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
        && request.auth.uid == resource.data.autorId;
    }

    // Admin solo
    match /admin/{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.token.admin == true;
    }
  }
}
```

## Subcolecciones (datos relacionados)

```typescript
// Estructura: usuarios/{userId}/posts/{postId}

// Agregar post a un usuario específico
await addDoc(
  collection(db, 'usuarios', userId, 'posts'), 
  { titulo: 'Mi post', contenido: '...' }
)

// Leer posts de un usuario
const postsRef = collection(db, 'usuarios', userId, 'posts')
const posts = await getDocs(postsRef)
```

## Firebase Admin (backend)

```typescript
// lib/firebase-admin.ts
import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  })
}

export const adminDb = admin.firestore()
export const adminAuth = admin.auth()
```

## ⚠️ Limitaciones importantes

- **50k reads/día:** se puede agotar con dashboards o listas que leen muchos documentos
- **Sin JOINs ni queries complejas:** Firestore no soporta queries SQL; el modelo de datos debe diseñarse para las queries que necesitas
- **Sin agregaciones nativas:** para contar, sumar, etc. debes usar Cloud Functions o mantener contadores manuales
- **Cold starts en Functions:** las Cloud Functions free tier tienen cold start alto
