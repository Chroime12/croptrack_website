import { Request, Response } from "express";
import supabase from "../lib/supabase";
import { errorLog } from "../utils/logger";

export const signUp = async (req: Request, res: Response): Promise<void> => {
  const { userFname, userLname, email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      res.status(400).json({ message: error.message });
      console.error("Error during signup:", error);
      return;
    }

    const { user } = data;
    const { error: insertError } = await supabase
      .from("users")
      .upsert({
        user_id: user?.id,
        user_fname: userFname,
        user_lname: userLname,
        userEmail: email,
      })
      .single();

    if (insertError) {
      res.status(400).json({ message: insertError.message });
      console.error("Error during signup:", insertError);
      return;
    }

    res.status(200).json({
      message:
        "Signed up successfully! Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { emailOrUsername, password } = req.body;

  console.log("Received login request with:", emailOrUsername, password);

  try {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        "user_fname, user_lname, user_email, user_municipality, user_province, user_barangay, role_id, roles(role_name)"
      )
      .eq("user_email", emailOrUsername)
      .in("role_id", [1, 2])
      .single();

    if (userError || !userData) {
      errorLog("Error or no user found:", userError);
      res.status(400).json({ message: "Invalid email or user does not exist" });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: userData.user_email,
      password,
    });

    if (error) {
      res.status(400).json({ message: error.message });
      errorLog("Error during login:", error);
      return;
    }

    res.status(200).json(userData);
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      res.status(401).json({ message: error.message });
      return;
    }

    const { user } = data;

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        "user_fname, user_lname, user_email, user_municipality, user_province, user_barangay, role_id, roles(role_name)"
      )
      .eq("user_id", user?.id)
      .single();

    if (userError) {
      res.status(400).json({ message: userError.message });
      console.error("Error during checkAuth:", userError);
      return;
    }

    console.log("Authenticated user data:", userData);

    res.status(200).json(userData);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    const redirectUrl = `http://localhost:5173/reset-password?email=${encodeURIComponent(
      email
    )}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      res.status(400).json({ message: error.message });
      console.error("Error during forgot password:", error);
      return;
    }

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error during forgot password:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { password, token, email } = req.body;
    const { error: tokenError } = await supabase.auth.verifyOtp({
      email: email,
      token: token,
      type: "recovery",
    });

    if (tokenError) {
      res.status(400).json({ message: tokenError.message });
      console.error("Error during reset password:", tokenError);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      res.status(400).json({ message: updateError.message });
      console.error("Error during reset password:", updateError);
      return;
    }

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error during reset password:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      res.status(400).json({ message: error.message });
      console.error("Error during logout:", error);
      return;
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
