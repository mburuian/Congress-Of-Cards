async validateUser(username: string, password: string): Promise<any> {
  const user = await this.usersService.findByUsername(username);
  if (user && user.password === password) {
    // remove password before returning
    const { password, ...result } = user;
    return result;
  }
  return null;
}
