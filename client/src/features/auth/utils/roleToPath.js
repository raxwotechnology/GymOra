export function roleToPath(role) {
  switch (role) {
    case "super-admin":
      return "/super-admin";
    case "owner":
      return "/owner";
    case "coach":
      return "/coach";
    case "member":
      return "/member";
    default:
      return "/login";
  }
}
