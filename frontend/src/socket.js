import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

function getStoredName() {
  let name = localStorage.getItem('syncboard_name');
  if (!name) {
    const adjectives = ['Swift', 'Calm', 'Bright', 'Bold', 'Quiet', 'Sharp'];
    const animals = ['Falcon', 'Otter', 'Lynx', 'Heron', 'Fox', 'Wren'];
    name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${
      animals[Math.floor(Math.random() * animals.length)]
    }`;
    localStorage.setItem('syncboard_name', name);
  }
  return name;
}

export const socket = io(BACKEND_URL, {
  autoConnect: true,
  auth: { name: getStoredName() },
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
});

export function renameUser(newName) {
  localStorage.setItem('syncboard_name', newName);
  socket.auth.name = newName;
  socket.disconnect().connect();
}

export function getUserName() {
  return getStoredName();
}
