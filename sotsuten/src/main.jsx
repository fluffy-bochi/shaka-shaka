import React from 'react';
import { createRoot } from 'react-dom/client';
import Interactive from './Interactive';
import PostForm from './PostForm';
import './app.css';

// /?post はスマホの投稿画面（展示のQRコードから開く）
const isPost = new URLSearchParams(location.search).has('post');
if (isPost) document.body.classList.add('post-page');
createRoot(document.getElementById('root')).render(isPost ? <PostForm /> : <Interactive />);
