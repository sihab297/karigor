import { UserModel, type UserDocument } from '../models/user.model';
import { AppError } from '../utils/app-error';
import { createToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { normalizeBdPhone } from '../utils/phone';
import type { LoginInput, RegisterInput } from '../validators/auth.validators';

// checked when nobody has that phone/email, so a wrong login takes the same time either way
const DUMMY_HASH = '$2b$10$09l2RyYmgh7lmEIl9JrIv.LpU3inkTzwx/SKMTVsb6eAgdfK4R.qy';

export const BLOCKED_MESSAGE = 'Your account has been blocked. Please contact Karigor support.';

function loggedIn(user: UserDocument) {
  return { token: createToken(user.id, user.role), user };
}

function isDuplicateKeyError(error: unknown) {
  return (error as { code?: number }).code === 11000;
}

export async function registerUser(input: RegisterInput) {
  if (await UserModel.exists({ phone: input.phone })) {
    throw new AppError(409, 'PHONE_TAKEN', 'An account with this phone number already exists.');
  }
  if (input.email && (await UserModel.exists({ email: input.email }))) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
  }

  const { password, ...details } = input;
  try {
    const user = await UserModel.create({ ...details, passwordHash: await hashPassword(password) });
    return loggedIn(user);
  } catch (error) {
    // two sign-ups with the same phone at the same moment
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'ACCOUNT_EXISTS', 'An account with these details already exists.');
    }
    throw error;
  }
}

export async function loginUser({ phoneOrEmail, password }: LoginInput) {
  const filter = phoneOrEmail.includes('@')
    ? { email: phoneOrEmail.toLowerCase() }
    : { phone: normalizeBdPhone(phoneOrEmail) };

  const user = await UserModel.findOne(filter).select('+passwordHash');
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw new AppError(401, 'WRONG_LOGIN', 'Wrong phone/email or password.');
  }
  if (user.status === 'blocked') {
    throw new AppError(403, 'ACCOUNT_BLOCKED', BLOCKED_MESSAGE);
  }
  return loggedIn(user);
}
