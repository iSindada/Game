import { openDB } from 'idb'

export async function getDB(){
  return openDB('arcade-db', 1, {
    upgrade(db){
      db.createObjectStore('roms', { keyPath: 'id', autoIncrement: true })
      db.createObjectStore('settings')
      db.createObjectStore('covers') // key: romId -> dataURL
    }
  })
}

export async function addRom({name, platform, blob}){
  const db = await getDB()
  const id = await db.add('roms', { name, platform, created: Date.now(), blob })
  return id
}

export async function listRoms(){
  const db = await getDB()
  return db.getAll('roms')
}

export async function getRom(id){
  const db = await getDB()
  return db.get('roms', id)
}

export async function removeRom(id){
  const db = await getDB()
  await db.delete('roms', id)
  await db.delete('covers', id)
}

export async function setCover(id, dataURL){
  const db = await getDB()
  await db.put('covers', dataURL, id)
}

export async function getCover(id){
  const db = await getDB()
  return db.get('covers', id)
}
