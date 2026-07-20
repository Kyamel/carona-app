// Doc privado users/{uid}: contém e-mail e chave PIX, legível só pelo dono.
// O status de verificação de e-mail vive no token do Firebase Auth, não aqui.
export type UserProfile = {
  id: string;
  name: string;
  email: string;
  pixKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  photo?: string;
  bio?: string;
};
